import * as React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Box, Text } from '../primitives';
import { useTheme } from '../theme';

type FullScreenLoaderProps = {
  message?: string;
};

export function FullScreenLoader({ message }: FullScreenLoaderProps): React.JSX.Element {
  const t = useTheme();

  return (
    <Box flex={1} align="center" justify="center" bg="background" gap="sm" style={styles.container}>
      <ActivityIndicator size="large" color={t.colors.primary} />
      {message ? <Text variant="bodyMuted">{message}</Text> : null}
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%'
  }
});

export type { FullScreenLoaderProps };
