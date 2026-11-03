/**
 * Component: Header.tsx
 * Renders title, subtitle, user info
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '../../components/Layout/Header';

// Mock dependencies
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext';
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { username: 'admin', name: 'Super Admin', role: 'super_admin' },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  });
});

describe('Header', () => {
  it('renders the page title', () => {
    render(<Header collapsed={false} title="Dashboard" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders the subtitle when provided', () => {
    render(<Header collapsed={false} title="Users" subtitle="Manage employees" />);
    expect(screen.getByText('Manage employees')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    const { container } = render(<Header collapsed={false} title="Export" />);
    const subtitleEl = container.querySelector('.header-title p');
    expect(subtitleEl).toBeNull();
  });

  it('shows the user name from auth context', () => {
    render(<Header collapsed={false} title="Test" />);
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
  });

  it('shows the user role', () => {
    render(<Header collapsed={false} title="Test" />);
    expect(screen.getByText('super_admin')).toBeInTheDocument();
  });

  it('shows first letter of user name as avatar', () => {
    render(<Header collapsed={false} title="Test" />);
    expect(screen.getByText('S')).toBeInTheDocument(); // 'S' from 'Super Admin'
  });

  it('shows "A" avatar when no user', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, isLoading: false, login: vi.fn(), logout: vi.fn() });
    render(<Header collapsed={false} title="Test" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('applies "collapsed" class when collapsed=true', () => {
    const { container } = render(<Header collapsed={true} title="Test" />);
    expect(container.querySelector('.header.collapsed')).not.toBeNull();
  });

  it('does not apply "collapsed" class when collapsed=false', () => {
    const { container } = render(<Header collapsed={false} title="Test" />);
    expect(container.querySelector('.header.collapsed')).toBeNull();
  });
});
