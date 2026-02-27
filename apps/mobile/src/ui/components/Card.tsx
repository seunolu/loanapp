import * as React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from '../theme';

export function Card({ style, ...rest }: ViewProps): React.JSX.Element {
  const t = useTheme();

  return (
    <View
      {...rest}
      style={[
        styles.base,
        {
          backgroundColor: t.colors.surface,
          borderColor: t.colors.border,
          borderRadius: t.radius.lg,
          padding: t.spacing.lg
        },
        style
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1
  }
});
