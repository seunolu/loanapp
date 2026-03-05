import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { ModalSheet } from './ModalSheet';
import { Pressable, Text } from '../primitives';
import { useTheme } from '../theme';

export type SelectOption<T extends string> = {
  label: string;
  value: T;
  description?: string;
};

type SelectFieldProps<T extends string> = {
  label: string;
  value: T | '';
  options: SelectOption<T>[];
  placeholder?: string;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  onChange: (value: T) => void;
};

export function SelectField<T extends string>({
  label,
  value,
  options,
  placeholder = 'Select an option',
  helperText,
  errorText,
  disabled = false,
  onChange
}: SelectFieldProps<T>): React.JSX.Element {
  const t = useTheme();
  const [open, setOpen] = React.useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={[styles.wrapper, { gap: t.spacing.xs }]}>
      <Text variant="caption">{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.control,
          {
            minHeight: 48,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: errorText ? t.colors.danger : t.colors.border,
            backgroundColor: t.colors.surface,
            paddingHorizontal: t.spacing.md,
            opacity: disabled ? 0.7 : 1
          }
        ]}
      >
        <Text color={selected ? 'text' : 'textMuted'}>{selected?.label ?? placeholder}</Text>
        <Text color="textMuted">{'>'}</Text>
      </Pressable>

      {errorText ? (
        <Text variant="caption" color="danger">
          {errorText}
        </Text>
      ) : helperText ? (
        <Text variant="caption" color="textMuted">
          {helperText}
        </Text>
      ) : null}

      <ModalSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={{ gap: t.spacing.xs }}>
          {options.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={[
                styles.option,
                {
                  borderRadius: t.radius.md,
                  borderWidth: 1,
                  borderColor: value === option.value ? t.colors.primary : t.colors.border,
                  backgroundColor: value === option.value ? t.colors.surface2 : t.colors.surface,
                  padding: t.spacing.md
                }
              ]}
            >
              <Text>{option.label}</Text>
              {option.description ? (
                <Text variant="caption" color="textMuted">
                  {option.description}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%'
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  option: {
    gap: 4
  }
});

