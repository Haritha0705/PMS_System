/**
 * Page: MonthlyPaysheets.tsx
 * Shows list, add form, edit form, preview
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../components/MonthlyPaysheetForm', () => ({
  MonthlyPaysheetForm: ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => (
    <div data-testid="paysheet-form">
      <button onClick={onSuccess}>Submit Form</button>
      <button onClick={onCancel}>Cancel Form</button>
    </div>
  ),
}));

vi.mock('../../components/PaysheetList', () => ({
  PaysheetList: ({
    onEdit,
    onView,
  }: {
    onEdit: (ps: unknown) => void;
    onView: (ps: unknown) => void;
  }) => (
    <div data-testid="paysheet-list">
      <button onClick={() => onEdit({ id: 'ps1', codeNo: 'E001', payMonth: '2026-04' })}>Edit Row</button>
      <button onClick={() => onView({ id: 'ps1', codeNo: 'E001', payMonth: '2026-04' })}>View Row</button>
    </div>
  ),
}));

vi.mock('../../components/PaySheet', () => ({
  default: () => <div data-testid="paysheet-preview-component">PaySheet</div>,
}));

vi.mock('../../services/userService', () => ({
  userService: { listUsers: vi.fn() },
}));
vi.mock('../../services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('../../components/Toast', () => ({ showToast: vi.fn() }));
vi.mock('react-to-print', () => ({ useReactToPrint: () => vi.fn() }));

import { userService } from '../../services/userService';
import { showToast } from '../../components/Toast';
import MonthlyPaysheets from '../../pages/MonthlyPaysheets';

const mockListUsers = userService.listUsers as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockListUsers.mockResolvedValue({ users: [] });
});

function renderPage() {
  return render(<MemoryRouter><MonthlyPaysheets /></MemoryRouter>);
}

describe('MonthlyPaysheets page', () => {
  it('renders PaysheetList by default', () => {
    renderPage();
    expect(screen.getByTestId('paysheet-list')).toBeInTheDocument();
  });

  it('does not show form by default', () => {
    renderPage();
    expect(screen.queryByTestId('paysheet-form')).toBeNull();
  });

  it('renders Create Paysheet button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /create paysheet/i })).toBeInTheDocument();
  });

  it('shows form when Create Paysheet is clicked', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /create paysheet/i }));
    expect(screen.getByTestId('paysheet-form')).toBeInTheDocument();
  });

  it('hides form when Cancel is clicked', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /create paysheet/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel form/i }));
    expect(screen.queryByTestId('paysheet-form')).toBeNull();
  });

  it('hides form and shows success toast when form submitted', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /create paysheet/i }));
    await userEvent.click(screen.getByRole('button', { name: /submit form/i }));
    await waitFor(() => {
      expect(screen.queryByTestId('paysheet-form')).toBeNull();
      expect(showToast).toHaveBeenCalledWith('Paysheet saved successfully!', 'success');
    });
  });

  it('shows form with edit data when Edit Row clicked', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /edit row/i }));
    expect(screen.getByTestId('paysheet-form')).toBeInTheDocument();
  });

  it('shows preview when View Row clicked', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /view row/i }));
    await waitFor(() => {
      expect(screen.getByTestId('paysheet-preview-component')).toBeInTheDocument();
    });
  });
});
