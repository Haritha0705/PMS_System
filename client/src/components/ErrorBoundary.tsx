import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Shows a way back instead of a blank page when a page crashes while rendering. */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Page crashed:', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="login-page">
        <div className="login-bg" />
        <div className="login-card">
          <h1>Something Went Wrong</h1>
          <p className="subtitle">The application could not display this page</p>
          <button
            type="button"
            className="btn btn-primary btn-full btn-lg"
            onClick={() => window.location.assign('/')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }
}
