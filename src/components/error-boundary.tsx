import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error captured by ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[300px] items-center justify-center p-6 text-center">
          <div className="glass max-w-md rounded-2xl p-6 border border-coral/20 bg-coral/5">
            <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              An error occurred while loading this section. Please try again.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 rounded-xl gradient-eco px-4 py-2 text-xs font-medium text-primary-foreground"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
