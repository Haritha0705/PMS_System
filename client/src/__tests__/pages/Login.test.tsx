/**
 * Page: Login.tsx
 * Form validation, submit, error messages, navigation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../components/Toast', () => ({ showToast: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) };
});

import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import { useNavigate } from 'react-router-dom';
import Login from '../../pages/Login';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ login: mockLogin, user: null, isAuthenticated: false, isLoading: false, logout: vi.fn() });
  (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);
});

function renderLogin() {
  return render(<MemoryRouter><Login /></MemoryRouter>);
}

// ── Render ────────────────────────────────────────────────────

describe('Login page — render', () => {
  it('renders username and password inputs', () => {
    renderLogin();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders a Sign In button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});

// ── Validation ────────────────────────────────────────────────

describe('Login page — validation', () => {
  it('shows error toast when username is empty', async () => {
    renderLogin();
    await userEvent.type(screen.getByLabelText(/password/i), 'admin123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/username and password/i), 'error');
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows error toast when password is empty', async () => {
    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/username and password/i), 'error');
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });
});

// ── Successful login ──────────────────────────────────────────

describe('Login page — successful login', () => {
  it('calls login with correct credentials', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLogin();

    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    await userEvent.type(screen.getByLabelText(/password/i), 'admin123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'admin123');
    });
  });

  it('shows success toast and navigates to "/" on successful login', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLogin();

    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    await userEvent.type(screen.getByLabelText(/password/i), 'admin123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Login successful', 'success');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows "Signing in..." text while loading', async () => {
    let resolve!: (value?: unknown) => void;
    mockLogin.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderLogin();

    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    await userEvent.type(screen.getByLabelText(/password/i), 'admin123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();
    resolve();
  });
});

// ── Login errors ──────────────────────────────────────────────

describe('Login page — error handling', () => {
  it('shows error toast on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    renderLogin();

    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Invalid username or password', 'error');
    });
  });

  it('shows server error for network error', async () => {
    mockLogin.mockRejectedValue(new Error('Network error: Unable to reach server'));
    renderLogin();

    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    await userEvent.type(screen.getByLabelText(/password/i), 'admin123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/cannot connect to server/i), 'error');
    });
  });

  it('re-enables button after failed login', async () => {
    mockLogin.mockRejectedValue(new Error('Bad credentials'));
    renderLogin();

    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
    });
  });
});
