/**
 * Component: Sidebar.tsx
 * Nav links, collapse state, logout
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../../components/Layout/Sidebar';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext';
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockLogout = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { username: 'admin', name: 'Super Admin', role: 'super_admin' },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: mockLogout,
  });
});

function renderSidebar(collapsed = false) {
  const onToggle = vi.fn();
  const result = render(
    <MemoryRouter>
      <Sidebar collapsed={collapsed} onToggle={onToggle} />
    </MemoryRouter>
  );
  return { ...result, onToggle };
}

describe('Sidebar — navigation links', () => {
  it('renders all main nav items when expanded', () => {
    renderSidebar(false);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Payroll')).toBeInTheDocument();
    expect(screen.getByText('Monthly Paysheets')).toBeInTheDocument();
    expect(screen.getByText('Print Payslips')).toBeInTheDocument();
    expect(screen.getByText('Export & Backup')).toBeInTheDocument();
  });

  it('does not show nav labels when collapsed', () => {
    renderSidebar(true);

    expect(screen.queryByText('Dashboard')).toBeNull();
    expect(screen.queryByText('Users')).toBeNull();
  });

  it('nav links point to correct paths', () => {
    renderSidebar(false);

    const usersLink = screen.getByText('Users').closest('a');
    expect(usersLink?.getAttribute('href')).toBe('/users');

    const payrollLink = screen.getByText('Payroll').closest('a');
    expect(payrollLink?.getAttribute('href')).toBe('/payroll');

    const exportLink = screen.getByText('Export & Backup').closest('a');
    expect(exportLink?.getAttribute('href')).toBe('/export');
  });
});

describe('Sidebar — collapse behaviour', () => {
  it('applies "collapsed" class when collapsed=true', () => {
    const { container } = renderSidebar(true);
    expect(container.querySelector('.sidebar.collapsed')).not.toBeNull();
  });

  it('does not apply "collapsed" class when expanded', () => {
    const { container } = renderSidebar(false);
    expect(container.querySelector('.sidebar.collapsed')).toBeNull();
  });

  it('calls onToggle when toggle button is clicked', async () => {
    const { onToggle } = renderSidebar(false);
    // The toggle button has class "sidebar-toggle" and no text label (only an icon)
    const toggleBtn = document.querySelector('.sidebar-toggle') as HTMLButtonElement;
    expect(toggleBtn).not.toBeNull();
    await userEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalled();
  });
});

describe('Sidebar — logout', () => {
  it('calls logout when Logout button is clicked', async () => {
    renderSidebar(false);

    const logoutBtn = screen.getByText('Logout');
    await userEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalled();
  });
});
