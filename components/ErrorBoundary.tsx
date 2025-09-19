import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    // Log error to console
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Optionally send to backend
    // fetch('/api/log-error', { method: 'POST', body: JSON.stringify({ error, errorInfo }) });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-100 text-red-800 p-4 rounded mt-4">
          <h2 className="font-bold">Something went wrong.</h2>
          <pre className="text-xs overflow-x-auto">{this.state.error?.toString()}</pre>
          <details className="text-xs mt-2" open>
            <summary>Stack Trace</summary>
            <pre>{this.state.errorInfo?.componentStack}</pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
