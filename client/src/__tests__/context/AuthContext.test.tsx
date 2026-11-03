/**
 * Context: AuthContext.tsx
 * AuthProvider: session restore, login, logout
 * useAuth: throws outside provider
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import api, { setAccessToken, getRefreshToken, saveRefreshToken, deleteRefreshToken } from '../../services/api';

vi.mock('../../services/api', () => {
  const mockSetAccessToken = vi.fn();
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { baseURL: 'http://localhost:4500/api', headers: { 'Content-Type': 'application/json' } },
  };
  return {
    default: mockApi,
    setAccessToken: mockSetAccessToken,
    getRefreshToken: vi.fn(() => null),
    saveRefreshToken: vi.fn(),
    deleteRefreshToken: vi.fn(),
  };
});

const mockApi = api as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };
const mockSetAccessToken = setAccessToken as ReturnType<typeof vi.fn>;
const mockGetRefreshToken = getRefreshToken as unknown as ReturnType<typeof vi.fn>;
const mockSaveRefreshToken = saveRefreshToken as unknown as ReturnType<typeof vi.fn>;
const mockDeleteRefreshToken = deleteRefreshToken as unknown as ReturnType<typeof vi.fn>;

// Helper to consume auth context in a component
function AuthConsumer() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="username">{user?.username ?? 'none'}</div>
      <button onClick={() => login('admin', 'admin123')} data-testid="login-btn">Login</button>
      <button onClick={logout} data-testid="logout-btn">Logout</button>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no refresh token stored
  mockGetRefreshToken.mockReturnValue(null);
});

// ── Session restore ───────────────────────────────────────────

describe('AuthProvider — session restore', () => {
  it('sets isLoading=false when no refresh token exists', async () => {
    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('restores session when valid refresh token exists', async () => {
    mockGetRefreshToken.mockReturnValue('valid-refresh-token');
    mockApi.post.mockResolvedValue({ data: { accessToken: 'new-access-token' } });
    mockApi.get.mockResolvedValue({ data: { username: 'admin', name: 'Super Admin', role: 'super_admin' } });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('username').textContent).toBe('admin');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(mockSetAccessToken).toHaveBeenCalledWith('new-access-token');
  });

  it('stays logged out when refresh token exchange fails', async () => {
    mockGetRefreshToken.mockReturnValue('expired-token');
    mockApi.post.mockRejectedValue(new Error('Token expired'));

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(mockSetAccessToken).toHaveBeenCalledWith(null);
    expect(mockDeleteRefreshToken).toHaveBeenCalled();
  });
});

// ── Login ─────────────────────────────────────────────────────

describe('AuthProvider — login', () => {
  it('sets user and saves refresh token on successful login', async () => {
    mockApi.post.mockResolvedValue({
      data: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { username: 'admin', name: 'Super Admin', role: 'super_admin' },
      },
    });

    renderWithAuth();

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await act(async () => {
      await userEvent.click(screen.getByTestId('login-btn'));
    });

    expect(screen.getByTestId('username').textContent).toBe('admin');
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(mockSetAccessToken).toHaveBeenCalledWith('access-token');
    expect(mockSaveRefreshToken).toHaveBeenCalledWith('refresh-token');
  });

  it('leaves user unauthenticated when login API fails', async () => {
    // Never resolves successfully → POST throws
    mockApi.post.mockRejectedValue(new Error('Wrong credentials'));

    // Render a consumer that catches the login error internally
    function SafeConsumer() {
      const { user, isAuthenticated, isLoading, login } = useAuth();
      const [loginError, setLoginError] = useState('');
      return (
        <div>
          <div data-testid="loading">{String(isLoading)}</div>
          <div data-testid="authenticated">{String(isAuthenticated)}</div>
          <div data-testid="username">{user?.username ?? 'none'}</div>
          <div data-testid="error">{loginError}</div>
          <button
            onClick={() => login('admin', 'wrong').catch((e: Error) => setLoginError(e.message))}
            data-testid="login-btn"
          >
            Login
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <SafeConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await act(async () => {
      await userEvent.click(screen.getByTestId('login-btn'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Wrong credentials');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });
});

// ── Logout ────────────────────────────────────────────────────

describe('AuthProvider — logout', () => {
  it('clears user and deletes refresh token', async () => {
    // Setup: already logged in
    mockGetRefreshToken.mockReturnValue('valid-refresh-token');
    mockApi.post
      .mockResolvedValueOnce({ data: { accessToken: 'new-access-token' } }) // refresh
      .mockResolvedValueOnce({ data: {} }); // logout
    mockApi.get.mockResolvedValue({ data: { username: 'admin', name: 'Super Admin', role: 'super_admin' } });

    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('username').textContent).toBe('admin'));

    await act(async () => {
      await userEvent.click(screen.getByTestId('logout-btn'));
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('username').textContent).toBe('none');
    expect(mockSetAccessToken).toHaveBeenCalledWith(null);
    expect(mockDeleteRefreshToken).toHaveBeenCalled();
  });

  it('still clears local state even if server logout fails', async () => {
    mockGetRefreshToken.mockReturnValue('valid-refresh-token');
    mockApi.post
      .mockResolvedValueOnce({ data: { accessToken: 'new-access-token' } })
      .mockRejectedValueOnce(new Error('Server unreachable'));
    mockApi.get.mockResolvedValue({ data: { username: 'admin', name: 'Super Admin', role: 'super_admin' } });

    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('username').textContent).toBe('admin'));

    await act(async () => {
      await userEvent.click(screen.getByTestId('logout-btn'));
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });
});

// ── useAuth outside provider ──────────────────────────────────

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    function BadComponent() {
      useAuth();
      return null;
    }
    // Suppress React error output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BadComponent />)).toThrow('useAuth must be used within AuthProvider');
    spy.mockRestore();
  });
});
