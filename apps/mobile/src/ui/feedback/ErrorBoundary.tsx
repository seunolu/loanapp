import * as React from 'react';
import { useRouter } from 'expo-router';
import { Button } from '../components';
import { Box, Text } from '../primitives';
import { Screen } from '../screen';

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

function captureGlobalError(error: Error): void {
  // eslint-disable-next-line no-console
  console.error('[mobile] Unhandled app error', error);
  try {
    const Sentry = require('@sentry/react-native') as { captureException?: (value: unknown) => void };
    Sentry.captureException?.(error);
  } catch {
    // Sentry is optional.
  }
}

async function reloadOrRouteHome(replace: (href: string) => void): Promise<void> {
  try {
    const Updates = require('expo-updates') as { reloadAsync?: () => Promise<void> };
    if (typeof Updates.reloadAsync === 'function') {
      await Updates.reloadAsync();
      return;
    }
  } catch {
    // expo-updates is optional.
  }
  replace('/');
}

class InnerErrorBoundary extends React.Component<
  ErrorBoundaryProps & { onRestart: () => Promise<void> },
  ErrorBoundaryState
> {
  public constructor(props: ErrorBoundaryProps & { onRestart: () => Promise<void> }) {
    super(props);
    this.state = { error: null };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  public componentDidCatch(error: Error): void {
    captureGlobalError(error);
  }

  private readonly handleRestart = async () => {
    await this.props.onRestart();
    this.setState({ error: null });
  };

  public render(): React.ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <Screen preset="fixed" safeTop safeBottom padding="lg">
        <Box flex={1} align="center" justify="center" gap="md">
          <Text variant="h1">Something went wrong</Text>
          <Text variant="bodyMuted" style={{ textAlign: 'center' }}>
            We hit an unexpected error. Restart the app to continue.
          </Text>
          <Button label="Restart" onPress={() => void this.handleRestart()} />
        </Box>
      </Screen>
    );
  }
}

export function ErrorBoundary({ children }: ErrorBoundaryProps): React.JSX.Element {
  const router = useRouter();

  const onRestart = React.useCallback(async () => {
    await reloadOrRouteHome((href) => router.replace(href as never));
  }, [router]);

  return <InnerErrorBoundary onRestart={onRestart}>{children}</InnerErrorBoundary>;
}
