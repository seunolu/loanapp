import * as React from 'react';
import { StyleSheet, TextInput, View, type TextInputProps, type TextStyle } from 'react-native';
import { Text } from '../primitives';
import { useTheme } from '../theme';

type InputProps = TextInputProps & {
  label?: string;
  helperText?: string;
  errorText?: string;
  helper?: string;
  error?: string;
  leftAccessory?: React.ReactNode;
  rightAccessory?: React.ReactNode;
};

export function Input({
  label,
  helperText,
  errorText,
  helper,
  error,
  style,
  leftAccessory,
  rightAccessory,
  ...rest
}: InputProps): React.JSX.Element {
  const t = useTheme();
  const resolvedError = errorText ?? error;
  const resolvedHelper = helperText ?? helper;
  const controlStyle = StyleSheet.flatten(style) as TextStyle | undefined;

  return (
    <View style={[styles.wrapper, { gap: t.spacing.xs }]}>
      {label ? <Text variant="caption">{label}</Text> : null}
      <View
        style={[
          styles.input,
          {
            minHeight: 48,
            borderRadius: t.radius.md,
            borderColor: resolvedError ? t.colors.danger : t.colors.border,
            backgroundColor: t.colors.surface,
            paddingHorizontal: t.spacing.md,
            gap: t.spacing.sm
          }
        ]}
      >
        {leftAccessory}
        <TextInput
          {...rest}
          placeholderTextColor={t.colors.textMuted}
          style={[
            styles.control,
            {
              color: t.colors.text
            },
            controlStyle
          ]}
        />
        {rightAccessory}
      </View>
      {resolvedError ? (
        <Text variant="caption" color="danger">
          {resolvedError}
        </Text>
      ) : resolvedHelper ? (
        <Text variant="caption" color="textMuted">
          {resolvedHelper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%'
  },
  input: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  control: {
    flex: 1,
    minHeight: 46
  }
});

export type { InputProps };
