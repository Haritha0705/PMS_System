/**
 * Component: Layout.tsx
 * The mobile menu closes on navigation and stays closed when coming back.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Routes, Route } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';

vi.mock('../../components/Layout/Sidebar', () => ({
  default: ({ mobileOpen }: { mobileOpen?: boolean }) => (
    <div data-testid="menu" data-open={String(!!mobileOpen)}>
      <Link to="/users">Go to users</Link>
      <Link to="/">Go home</Link>
    </div>
  ),
}));

vi.mock('../../components/Layout/Header', () => ({
  default: ({ onMobileMenuOpen }: { onMobileMenuOpen?: () => void }) => (
    <button onClick={onMobileMenuOpen}>Open menu</button>
  ),
}));

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="*" element={<Layout />} />
      </Routes>
    </MemoryRouter>
  );
}

const menuOpen = () => screen.getByTestId('menu').getAttribute('data-open');

describe('Layout mobile menu', () => {
  it('opens from the header', async () => {
    renderLayout();
    expect(menuOpen()).toBe('false');

    await userEvent.click(screen.getByText('Open menu'));

    expect(menuOpen()).toBe('true');
  });

  it('closes on navigation and stays closed when coming back', async () => {
    renderLayout();
    await userEvent.click(screen.getByText('Open menu'));

    await userEvent.click(screen.getByText('Go to users'));
    expect(menuOpen()).toBe('false');

    await userEvent.click(screen.getByText('Go home'));
    expect(menuOpen()).toBe('false');
  });
});
