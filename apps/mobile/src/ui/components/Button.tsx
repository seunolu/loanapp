import * as React from 'react';
import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle, type AccessibilityProps } from 'react-native';
import { Pressable, Text } from '../primitives';
import { useTheme } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  children?: React.ReactNode;
  label?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
} & Pick<AccessibilityProps, 'accessibilityLabel' | 'accessibilityHint' | 'accessibilityRole'>;

export function Button({
  children,
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole
}: ButtonProps): React.JSX.Element {
  const t = useTheme();
  const isBlocked = disabled || loading;
  const textColor = variant === 'primary' || variant === 'danger' ? t.colors.textInverse : t.colors.text;
  const text = children ?? label;

  return (
    <Pressable
      onPress={onPress}
      disabled={isBlocked}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole ?? 'button'}
      style={[
        styles.base,
        { borderRadius: t.radius.md, gap: t.spacing.sm, paddingHorizontal: t.spacing.lg },
        sizeStyles(t)[size],
        variantStyles(t)[variant],
        fullWidth ? styles.fullWidth : null,
        isBlocked ? styles.disabled : null,
        style
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} size="small" /> : null}
      <Text variant="button" style={{ color: textColor }}>
        {text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  fullWidth: {
    width: '100%'
  },
  disabled: {
    opacity: 0.55
  }
});

const sizeStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    sm: { minHeight: 42, paddingVertical: t.spacing.sm },
    md: { minHeight: 46, paddingVertical: t.spacing.md },
    lg: { minHeight: 50, paddingVertical: t.spacing.md }
  });

const variantStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    primary: { backgroundColor: t.colors.primary },
    secondary: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: t.colors.danger }
  });

export type { ButtonProps, ButtonSize, ButtonVariant };
