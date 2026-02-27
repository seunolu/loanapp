import * as React from 'react';
import { ActivityIndicator, Image, StyleSheet } from 'react-native';
import { brand } from '../../brand';
import { Box, Text } from '../primitives';
import { Screen } from '../screen';
import { useTheme } from '../theme';

export function AppLoading(): React.JSX.Element {
  const t = useTheme();

  return (
    <Screen preset="fixed" safeTop safeBottom padding="lg">
      <Box flex={1} align="center" justify="center" gap="md">
        <Image source={brand.logo} resizeMode="contain" style={styles.logo} />
        <Text variant="h2" style={{ color: brand.colors.primary }}>
          {brand.appName}
        </Text>
        <Box row align="center" gap="sm">
          <ActivityIndicator size="small" color={t.colors.primary} />
          <Text variant="bodyMuted">Preparing your workspace...</Text>
        </Box>
      </Box>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 64,
    height: 64
  }
});
