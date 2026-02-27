import * as React from 'react';
import { RootErrorScreen } from './RootErrorScreen';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  onRetry?: () => void;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  public componentDidCatch(error: Error): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[mobile] Unhandled root error', error);
    }
  }

  private readonly handleRetry = () => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  public render(): React.ReactNode {
    if (this.state.error) {
      return <RootErrorScreen error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

