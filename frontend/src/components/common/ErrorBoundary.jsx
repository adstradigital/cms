'use client';

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onRetry === 'function') {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, border: '1px solid var(--theme-border)', borderRadius: 12, background: 'var(--theme-surface)', margin: 16 }}>
          <h3 style={{ marginTop: 0 }}>Something went wrong</h3>
          <p style={{ color: 'var(--theme-text-muted)' }}>
            This view failed to render. Try reloading this section.
          </p>
          <button
            onClick={this.handleRetry}
            style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--theme-border)', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
