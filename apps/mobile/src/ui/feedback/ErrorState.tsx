import * as React from 'react';
import { Button } from '../components';
import { Box, Text } from '../primitives';

type ErrorStateProps = {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = 'Something went wrong',
  message = 'Please try again in a moment.',
  retryLabel = 'Try again',
  onRetry
}: ErrorStateProps): React.JSX.Element {
  return (
    <Box bg="dangerSurface" borderColor="dangerBorder" borderWidth={1} radius="lg" p="lg" gap="sm" align="center">
      <Text variant="h2" color="danger">
        {title}
      </Text>
      <Text variant="bodyMuted" style={{ textAlign: 'center' }}>
        {message}
      </Text>
      {onRetry ? <Button variant="danger" label={retryLabel} onPress={onRetry} /> : null}
    </Box>
  );
}

export type { ErrorStateProps };
