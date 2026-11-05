/**
 * Page: ChangePassword.tsx
 * Submit, password mismatch, server failure, sign-out after success
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../components/Toast', () => ({ showToast: vi.fn() }));
vi.mock('../../services/api', () => ({ default: { post: vi.fn() } }));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import ChangePassword from '../../pages/ChangePassword';

const mockPost = api.post as ReturnType<typeof vi.fn>;
const mockLogout = vi.fn();

async function fillAndSubmit(current: string, next: string, confirm: string) {
  render(<MemoryRouter><ChangePassword /></MemoryRouter>);
  await userEvent.type(screen.getByLabelText(/current password/i), current);
  await userEvent.type(screen.getByLabelText(/^new password/i), next);
  await userEvent.type(screen.getByLabelText(/confirm new password/i), confirm);
  await userEvent.click(screen.getByRole('button', { name: 'Change Password' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLogout.mockResolvedValue(undefined);
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ logout: mockLogout });
});

describe('ChangePassword', () => {
  it('sends the passwords, then signs out and goes to login', async () => {
    mockPost.mockResolvedValue({ data: {} });

    await fillAndSubmit('old-password', 'new-password-1', 'new-password-1');

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true }));
    expect(mockPost).toHaveBeenCalledWith('/auth/change-password', {
      currentPassword: 'old-password',
      newPassword: 'new-password-1',
    });
    expect(mockLogout).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Password changed successfully', 'success');
  });

  it('does not call the server when the new passwords differ', async () => {
    await fillAndSubmit('old-password', 'new-password-1', 'new-password-2');

    expect(showToast).toHaveBeenCalledWith('Please enter the same new password in both fields', 'error');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('shows the server message and stays signed in on failure', async () => {
    mockPost.mockRejectedValue(new Error('Current password is incorrect.'));

    await fillAndSubmit('wrong-password', 'new-password-1', 'new-password-1');

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Current password is incorrect.', 'error'));
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('asks for at least 8 characters', () => {
    render(<MemoryRouter><ChangePassword /></MemoryRouter>);
    expect(screen.getByLabelText(/^new password/i)).toHaveAttribute('minlength', '8');
  });
});
