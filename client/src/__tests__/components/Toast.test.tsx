/**
 * Component: Toast.tsx
 * showToast(), ToastContainer renders/dismisses toasts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { showToast, ToastContainer } from '../../components/Toast';

// Real timers — waitFor and fake timers conflict badly
beforeEach(() => {
  vi.clearAllMocks();
});

// ── ToastContainer renders ────────────────────────────────────

describe('ToastContainer', () => {
  it('renders nothing when no toasts exist', () => {
    const { container } = render(<ToastContainer />);
    expect(container.querySelector('.toast-wrapper')).toBeNull();
  });

  it('shows a success toast with correct text', async () => {
    render(<ToastContainer />);

    await act(async () => {
      showToast('Operation successful', 'success');
    });

    expect(screen.getByText('Operation successful')).toBeInTheDocument();
  });

  it('shows an error toast', async () => {
    render(<ToastContainer />);

    await act(async () => {
      showToast('Something went wrong', 'error');
    });

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows an info toast', async () => {
    render(<ToastContainer />);

    await act(async () => {
      showToast('Heads up', 'info');
    });

    expect(screen.getByText('Heads up')).toBeInTheDocument();
  });

  it('defaults to info type when no type given', async () => {
    render(<ToastContainer />);

    await act(async () => {
      showToast('Default type');
    });

    expect(screen.getByText('Default type')).toBeInTheDocument();
  });

  it('removes toast after 4 seconds', async () => {
    vi.useFakeTimers();
    try {
      render(<ToastContainer />);

      await act(async () => {
        showToast('Temporary toast', 'success');
      });

      expect(screen.getByText('Temporary toast')).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(4000);
      });

      expect(screen.queryByText('Temporary toast')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('can show multiple toasts simultaneously', async () => {
    render(<ToastContainer />);

    await act(async () => {
      showToast('Toast 1', 'success');
      showToast('Toast 2', 'error');
    });

    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
  });

  it('success toast has toast-success class', async () => {
    render(<ToastContainer />);
    await act(async () => { showToast('ok', 'success'); });
    expect(document.querySelector('.toast-success')).not.toBeNull();
  });

  it('error toast has toast-error class', async () => {
    render(<ToastContainer />);
    await act(async () => { showToast('err', 'error'); });
    expect(document.querySelector('.toast-error')).not.toBeNull();
  });
});

// ── showToast before mount (pending queue) ────────────────────

describe('showToast — before ToastContainer mounts', () => {
  it('queues toasts and flushes them on mount', async () => {
    // Call showToast BEFORE rendering the container
    showToast('Pre-mount toast', 'info');

    // Now mount the container
    await act(async () => {
      render(<ToastContainer />);
    });

    expect(screen.getByText('Pre-mount toast')).toBeInTheDocument();
  });
});
