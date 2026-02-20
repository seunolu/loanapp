import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from './theme';

type Tone = 'info' | 'success' | 'warning' | 'danger' | 'muted';

type Props = {
  label: string;
  tone?: Tone;
};

export function Badge({ label, tone = 'muted' }: Props): React.JSX.Element {
  return (
    <View style={[styles.base, toneStyles[tone].bg]}>
      <Text style={[styles.label, toneStyles[tone].text]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill
  },
  label: {
    ...typography.caption
  }
});

const toneStyles = {
  info: StyleSheet.create({ bg: { backgroundColor: '#E9F2FF' }, text: { color: colors.info } }),
  success: StyleSheet.create({ bg: { backgroundColor: '#E8FBF4' }, text: { color: colors.success } }),
  warning: StyleSheet.create({ bg: { backgroundColor: '#FFF5E8' }, text: { color: colors.warning } }),
  danger: StyleSheet.create({ bg: { backgroundColor: '#FFECEB' }, text: { color: colors.danger } }),
  muted: StyleSheet.create({ bg: { backgroundColor: colors.surfaceMuted }, text: { color: colors.textMuted } })
} as const;

