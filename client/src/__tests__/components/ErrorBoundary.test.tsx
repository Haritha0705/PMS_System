/**
 * Component: ErrorBoundary.tsx
 * A page that crashes while rendering shows a way back instead of a blank page.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../../components/ErrorBoundary';

function Broken(): never {
  throw new Error('render failed');
}

describe('ErrorBoundary', () => {
  it('shows its children when nothing is wrong', () => {
    render(<ErrorBoundary><p>Page content</p></ErrorBoundary>);
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('shows a way back when a child crashes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<ErrorBoundary><Broken /></ErrorBoundary>);

    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Dashboard' })).toBeInTheDocument();
  });
});
