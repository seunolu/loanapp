import * as React from 'react';
import { Box, Button, Screen, Text } from '../ui';
import { AppError } from './AppError';

type RootErrorScreenProps = {
  error: unknown;
  onRetry: () => void;
};

function getMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'An unexpected startup error occurred.';
}

export function RootErrorScreen({ error, onRetry }: RootErrorScreenProps): React.JSX.Element {
  return (
    <Screen preset="fixed" safeTop safeBottom padding="lg">
      <Box flex={1} align="center" justify="center" gap="md">
        <Text variant="h1">Unable to start LoanApp</Text>
        <Text variant="bodyMuted" style={{ textAlign: 'center' }}>
          {getMessage(error)}
        </Text>
        <Button label="Retry" onPress={onRetry} />
      </Box>
    </Screen>
  );
}

