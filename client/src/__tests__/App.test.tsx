/**
 * App.tsx — ProtectedRoute logic and top-level routing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn(), AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../components/Toast', () => ({ ToastContainer: () => null, showToast: vi.fn() }));
vi.mock('../components/Layout/Layout', () => ({ default: () => <div data-testid="layout">Layout</div> }));
vi.mock('../pages/Login', () => ({ default: () => <div data-testid="login-page">Login</div> }));
vi.mock('../pages/Dashboard', () => ({ default: () => <div>Dashboard</div> }));
vi.mock('../pages/Users', () => ({ default: () => <div>Users</div> }));
vi.mock('../pages/UserForm', () => ({ default: () => <div>UserForm</div> }));
vi.mock('../pages/Payroll', () => ({ default: () => <div>Payroll</div> }));
vi.mock('../pages/MonthlyPaysheets', () => ({ default: () => <div>MonthlyPaysheets</div> }));
vi.mock('../pages/PrintPayslips', () => ({ default: () => <div>PrintPayslips</div> }));
vi.mock('../pages/Export', () => ({ default: () => <div>Export</div> }));

import { useAuth } from '../context/AuthContext';
import App from '../App';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  // Reset URL so BrowserRouter always starts at '/' in each test
  window.history.replaceState(null, '', '/');
});

describe('App — ProtectedRoute', () => {
  it('shows spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true, user: null });
    render(<App />);
    expect(document.querySelector('.spinner')).not.toBeNull();
  });

  it('redirects to /login when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, user: null });
    render(<App />);
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('redirects to /login when user is not super_admin', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, user: { role: 'admin' } });
    render(<App />);
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('renders Layout when authenticated as super_admin', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, user: { role: 'super_admin' } });
    render(<App />);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });
});
