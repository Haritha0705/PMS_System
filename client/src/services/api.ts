import axios, { type InternalAxiosRequestConfig } from 'axios';

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

// ── Response interceptor — silent refresh on 401 ─────────────

let isRefreshing = false;
let pendingRequests: Array<{
  resolve: (config: InternalAxiosRequestConfig) => void;
  reject: (error: unknown) => void;
}> = [];

function processPendingRequests(newToken: string | null): void {
  for (const { resolve, reject } of pendingRequests) {
    if (newToken) {
      resolve({ headers: { Authorization: `Bearer ${newToken}` } } as InternalAxiosRequestConfig);
    } else {
      reject(new Error('Refresh failed'));
    }
  }
  pendingRequests = [];
}

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

    // Skip refresh attempts for auth endpoints or already-retried requests
    if (
      error.response.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/')
    ) {
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: () => {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Exchange refresh token for new access token
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });

      accessToken = data.accessToken;
      processPendingRequests(data.accessToken);

      // Retry the original request with new token
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch {
      // Refresh failed — clear everything and redirect to login
      accessToken = null;
      processPendingRequests(null);
      deleteRefreshToken();

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
