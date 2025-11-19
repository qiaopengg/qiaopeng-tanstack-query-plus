import type { ReactNode } from "react";
import { Component } from "react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetErrorBoundary: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  onReset?: () => void;
  resetKeys?: Array<string | number>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    this.props.onError?.(error, errorInfo);
  }
  resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: undefined });
  };
  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;
    if (hasError && error) {
      if (fallback) return fallback(error, this.resetErrorBoundary);
      return (
        <div className="flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <h3 className="text-lg font-semibold text-foreground mb-2">发生错误</h3>
            <p className="text-sm text-muted-foreground mb-4">{error.message || "请稍后重试"}</p>
            <button onClick={this.resetErrorBoundary} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
              重试
            </button>
          </div>
        </div>
      );
    }
    return children;
  }
}