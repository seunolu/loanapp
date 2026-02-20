import * as React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false
}: ButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth ? styles.fullWidth : null,
        pressed ? styles.pressed : null,
        isDisabled ? styles.disabled : null
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={textColorByVariant[variant]} /> : null}
      <Text style={[styles.text, { color: textColorByVariant[variant] }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.9 },
  text: {
    ...typography.button
  }
});

const sizeStyles = StyleSheet.create({
  sm: { minHeight: 44, paddingVertical: spacing.sm },
  md: { minHeight: 46, paddingVertical: spacing.md },
  lg: { minHeight: 50, paddingVertical: spacing.md }
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' }
});

const textColorByVariant: Record<Variant, string> = {
  primary: colors.primaryText,
  secondary: colors.text,
  ghost: colors.text
};

