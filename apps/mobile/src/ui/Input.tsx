import * as React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, spacing, typography } from './theme';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
};

export function Input({ label, error, style, ...props }: Props): React.JSX.Element {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs
  },
  label: {
    ...typography.caption,
    color: colors.text
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md
  },
  inputError: {
    borderColor: colors.danger
  },
  error: {
    ...typography.caption,
    color: colors.danger
  }
});

