import * as React from 'react';
import { ActivityIndicator } from 'react-native';
import { Box, Text } from '../primitives';
import { useTheme } from '../theme';

type InlineLoaderProps = {
  message?: string;
};

export function InlineLoader({ message = 'Loading...' }: InlineLoaderProps): React.JSX.Element {
  const t = useTheme();

  return (
    <Box row align="center" gap="sm">
      <ActivityIndicator size="small" color={t.colors.primary} />
      <Text variant="caption" color="textMuted">
        {message}
      </Text>
    </Box>
  );
}

export type { InlineLoaderProps };
