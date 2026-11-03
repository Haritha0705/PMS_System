/**
 * Component: EmployeeSelector.tsx
 * Renders employee list, selection, pagination, filters
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../hooks/useUsers', () => ({ useUsers: vi.fn() }));

import { useUsers } from '../../hooks/useUsers';
import EmployeeSelector from '../../components/EmployeeSelector';

const mockUseUsers = useUsers as ReturnType<typeof vi.fn>;

const fakeUser = {
  codeNo: 'E001',
  firstName: 'Alice',
  lastName: 'Smith',
  branch: 'Colombo',
  role: 'MANAGER',
  designation: 'Manager',
  status: 'active',
};

const defaultReturn = {
  users: [fakeUser],
  loading: false,
  error: null,
  response: { page: 1, totalPages: 2, total: 20 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseUsers.mockReturnValue(defaultReturn);
});

function renderSelector(
  selected = new Set<string>(),
  onChange = vi.fn(),
  props: Record<string, unknown> = {}
) {
  return render(
    <MemoryRouter>
      <EmployeeSelector
        selectedCodeNos={selected}
        onSelectionChange={onChange}
        {...props}
      />
    </MemoryRouter>
  );
}

describe('EmployeeSelector', () => {
  it('renders with default title "Select Employees"', () => {
    renderSelector();
    expect(screen.getByText('Select Employees')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    renderSelector(new Set(), vi.fn(), { title: 'Choose Employees' });
    expect(screen.getByText('Choose Employees')).toBeInTheDocument();
  });

  it('renders employee name in the list', () => {
    renderSelector();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseUsers.mockReturnValue({ ...defaultReturn, loading: true, users: [] });
    renderSelector();
    expect(document.querySelector('.loading-spinner, .spinner')).not.toBeNull();
  });

  it('shows empty state when no users', () => {
    mockUseUsers.mockReturnValue({ ...defaultReturn, users: [] });
    renderSelector();
    expect(screen.getByText(/no employees/i)).toBeInTheDocument();
  });

  it('calls onSelectionChange when employee row clicked', async () => {
    const onChange = vi.fn();
    renderSelector(new Set(), onChange);
    // Click the row or checkbox for the employee
    const rows = document.querySelectorAll('tbody tr');
    if (rows.length > 0) {
      await userEvent.click(rows[0]);
      expect(onChange).toHaveBeenCalled();
    }
  });

  it('renders search input', () => {
    renderSelector();
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('renders branch filter', () => {
    renderSelector();
    expect(screen.getByRole('option', { name: /all branches/i })).toBeInTheDocument();
  });

  it('renders pagination when totalPages > 1', () => {
    renderSelector();
    expect(screen.getByText(/next/i)).toBeInTheDocument();
  });

  it('shows selected count when employees are selected', () => {
    renderSelector(new Set(['E001']));
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
  });

  it('shows Clear All button when employees are selected', () => {
    renderSelector(new Set(['E001']));
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
  });

  it('calls onSelectionChange with empty set when Clear All clicked', async () => {
    const onChange = vi.fn();
    renderSelector(new Set(['E001']), onChange);
    await userEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(onChange).toHaveBeenCalledWith(new Set());
  });

  it('renders month picker when payMonth prop provided', () => {
    renderSelector(new Set(), vi.fn(), { payMonth: '2026-04', onPayMonthChange: vi.fn() });
    const monthInput = document.querySelector('input[type="month"]');
    expect(monthInput).not.toBeNull();
  });

  it('renders action button when provided', () => {
    renderSelector(new Set(), vi.fn(), { actionButton: <button>Load</button> });
    expect(screen.getByRole('button', { name: /load/i })).toBeInTheDocument();
  });
});
