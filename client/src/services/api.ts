import axios, { type AxiosError } from 'axios';

// Resolve API base from env. VITE_API_BASE_URL may be the bare origin
// (https://host) or already include the /api suffix — both are accepted.
// Falls back to localhost for local dev when the var is unset.
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4500')
  .replace(/\/+$/, '')      // drop trailing slashes
  .replace(/\/api$/, '');   // drop a trailing /api so we don't double it
const API_BASE_URL = `${API_ORIGIN}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── In-memory access token (never persisted) ─────────────────

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

// ── Refresh token (persisted in localStorage) ────────────────

const REFRESH_TOKEN_KEY = 'pms_refresh_token';

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function deleteRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ── Request interceptor — attach access token ────────────────

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ── Session refresh ──────────────────────────────────────────
// The server replaces the refresh token on every use, so each new one must be
// saved and only one exchange may run at a time.

let refreshInFlight: Promise<string> | null = null;

async function exchangeRefreshToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');

  const post = (token: string) =>
    axios.post<{ accessToken: string; refreshToken: string }>(`${API_BASE_URL}/auth/refresh`, { refreshToken: token });

  let response;
  try {
    response = await post(refreshToken);
  } catch (err) {
    // Another browser tab may have replaced the token while this request ran
    const latest = getRefreshToken();
    if (!latest || latest === refreshToken) throw err;
    response = await post(latest);
  }

  saveRefreshToken(response.data.refreshToken);
  accessToken = response.data.accessToken;
  return response.data.accessToken;
}

/** Exchange the stored refresh token for new tokens. Returns the new access token. */
export function refreshSession(): Promise<string> {
  refreshInFlight ??= exchangeRefreshToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

// ── Server error messages ────────────────────────────────────
// Puts the server's own message on the error, so pages can show error.message.

async function withServerMessage(error: AxiosError): Promise<AxiosError> {
  try {
    let data: unknown = error.response?.data;
    if (data instanceof Blob) data = await data.text();
    if (data instanceof ArrayBuffer) data = new TextDecoder().decode(data);
    if (typeof data === 'string') data = JSON.parse(data);

    const { details, error: message } = (data ?? {}) as { details?: unknown; error?: unknown };
    const detail = Array.isArray(details) ? details[0] : undefined;
    const text = typeof detail === 'string' ? detail : message;
    if (typeof text === 'string' && text) error.message = text;
  } catch {
    // Not a JSON error body — keep axios's own message
  }
  return error;
}

// ── Response interceptor — silent refresh on 401 ─────────────

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Provide detailed error message for network errors
    if (!error.response) {
      // Network error or timeout
      const detailedError = new Error(
        `Network error: Unable to reach server at ${api.defaults.baseURL}. Make sure the server is running.`
      );
      return Promise.reject(detailedError);
    }

    // Skip refresh attempts for auth endpoints or already-retried requests.
    // Changing the password is a normal signed-in request, so it may refresh.
    const isAuthRequest =
      originalRequest.url?.includes('/auth/') && !originalRequest.url.includes('/auth/change-password');
    if (error.response.status !== 401 || originalRequest._retry || isAuthRequest) {
      return Promise.reject(await withServerMessage(error));
    }

    originalRequest._retry = true;

    try {
      // Retry the original request with the new token
      const newAccessToken = await refreshSession();
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch {
      // Refresh failed — clear everything and redirect to login
      accessToken = null;
      deleteRefreshToken();

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(await withServerMessage(error));
    }
  }
);

export default api;
