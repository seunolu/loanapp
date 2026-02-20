import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

type Variant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function Badge({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: Variant }): React.JSX.Element {
  return (
    <View style={[styles.base, variantStyles[variant]]}>
      <Text style={[styles.text, textStyles[variant]]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    alignSelf: 'flex-start'
  },
  text: {
    ...typography.caption,
    fontWeight: '600'
  }
});

const variantStyles = StyleSheet.create({
  neutral: { backgroundColor: colors.surface2, borderColor: colors.border },
  info: { backgroundColor: colors.infoSurface, borderColor: '#BFDBFE' },
  success: { backgroundColor: colors.successSurface, borderColor: '#BBF7D0' },
  warning: { backgroundColor: colors.warningSurface, borderColor: '#FDE68A' },
  danger: { backgroundColor: colors.dangerSurface, borderColor: '#FECACA' }
});

const textStyles = StyleSheet.create({
  neutral: { color: colors.text },
  info: { color: colors.info },
  success: { color: colors.success },
  warning: { color: colors.warning },
  danger: { color: colors.danger }
});

