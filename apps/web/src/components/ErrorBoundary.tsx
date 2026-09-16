/**
 * ErrorBoundary — Catches rendering errors and shows a recovery UI.
 *
 * Prevents the entire app from crashing when a component throws.
 * Class component because React requires componentDidCatch / getDerivedStateFromError.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Shield, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex h-dvh w-full flex-col items-center justify-center gap-4 p-8"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          <Shield size={48} style={{ color: 'var(--color-danger)' }} />
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Something went wrong
          </h2>
          <p
            className="max-w-sm text-center text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            An unexpected error occurred. Your encrypted messages are safe — try
            reloading the app.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre
              className="mt-2 max-w-lg overflow-auto rounded-md p-3 text-xs"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--color-danger)',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
              }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleReload}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-text)',
              }}
            >
              <RefreshCw size={14} />
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
