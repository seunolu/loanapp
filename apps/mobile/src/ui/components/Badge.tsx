import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../primitives';
import { useTheme } from '../theme';

type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
type BadgeTone = 'muted' | 'info' | 'success' | 'warning' | 'danger';

type BadgeProps = {
  children?: React.ReactNode;
  label?: string;
  variant?: BadgeVariant;
  tone?: BadgeTone;
};

const toneMap: Record<BadgeTone, BadgeVariant> = {
  muted: 'neutral',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger'
};

export function Badge({ children, label, variant, tone }: BadgeProps): React.JSX.Element {
  const t = useTheme();
  const resolvedVariant = variant ?? (tone ? toneMap[tone] : 'neutral');

  return (
    <View
      style={[
        styles.base,
        {
          borderRadius: t.radius.pill,
          paddingHorizontal: t.spacing.sm,
          paddingVertical: 4
        },
        variantStyles(t)[resolvedVariant]
      ]}
    >
      <Text variant="caption" style={[styles.text, textStyles(t)[resolvedVariant]]}>
        {children ?? label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderWidth: 1
  },
  text: {
    fontWeight: '600'
  }
});

const variantStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    neutral: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    info: { backgroundColor: t.colors.infoSurface, borderColor: t.colors.infoBorder },
    success: { backgroundColor: t.colors.successSurface, borderColor: t.colors.successBorder },
    warning: { backgroundColor: t.colors.warningSurface, borderColor: t.colors.warningBorder },
    danger: { backgroundColor: t.colors.dangerSurface, borderColor: t.colors.dangerBorder }
  });

const textStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    neutral: { color: t.colors.text },
    info: { color: t.colors.info },
    success: { color: t.colors.success },
    warning: { color: t.colors.warning },
    danger: { color: t.colors.danger }
  });

export type { BadgeProps, BadgeVariant, BadgeTone };
