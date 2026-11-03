/**
 * Component: Layout.tsx
 * Page title mapping, sidebar collapse toggle
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';

// Mock child components to isolate Layout
vi.mock('../../components/Layout/Sidebar', () => ({
  default: ({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void; mobileOpen?: boolean; onMobileClose?: () => void }) => (
    <div data-testid="sidebar" data-collapsed={String(collapsed)}>
      <button onClick={onToggle} data-testid="sidebar-toggle">Toggle</button>
    </div>
  ),
}));

vi.mock('../../components/Layout/Header', () => ({
  default: ({ title, subtitle, collapsed }: { title: string; subtitle?: string; collapsed: boolean; onMobileMenuOpen?: () => void }) => (
    <div data-testid="header" data-collapsed={String(collapsed)}>
      <span data-testid="header-title">{title}</span>
      {subtitle && <span data-testid="header-subtitle">{subtitle}</span>}
    </div>
  ),
}));

// Mock react-router Outlet
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet-content">Page content</div>,
  };
});

function renderLayout(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<Layout />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Layout', () => {
  it('renders sidebar, header and outlet', () => {
    renderLayout('/');
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
  });

  it('shows Dashboard title for "/" route', () => {
    renderLayout('/');
    expect(screen.getByTestId('header-title').textContent).toBe('Dashboard');
  });

  it('shows User Management title for "/users" route', () => {
    renderLayout('/users');
    expect(screen.getByTestId('header-title').textContent).toBe('User Management');
  });

  it('shows Payroll title for "/payroll" route', () => {
    renderLayout('/payroll');
    expect(screen.getByTestId('header-title').textContent).toBe('Payroll');
  });

  it('shows Monthly Paysheets title for "/paysheets"', () => {
    renderLayout('/paysheets');
    expect(screen.getByTestId('header-title').textContent).toBe('Monthly Paysheets');
  });

  it('shows Export & Backup title for "/export"', () => {
    renderLayout('/export');
    expect(screen.getByTestId('header-title').textContent).toBe('Export & Backup');
  });

  it('shows Print Payslips title for "/print-payslips"', () => {
    renderLayout('/print-payslips');
    expect(screen.getByTestId('header-title').textContent).toBe('Print Payslips');
  });

  it('starts with sidebar expanded (collapsed=false)', () => {
    renderLayout('/');
    expect(screen.getByTestId('sidebar').getAttribute('data-collapsed')).toBe('false');
  });

  it('toggles sidebar collapsed state when toggle button clicked', async () => {
    renderLayout('/');
    expect(screen.getByTestId('sidebar').getAttribute('data-collapsed')).toBe('false');

    await userEvent.click(screen.getByTestId('sidebar-toggle'));

    expect(screen.getByTestId('sidebar').getAttribute('data-collapsed')).toBe('true');
  });

  it('passes collapsed state to header', async () => {
    renderLayout('/');
    await userEvent.click(screen.getByTestId('sidebar-toggle'));
    expect(screen.getByTestId('header').getAttribute('data-collapsed')).toBe('true');
  });
});
