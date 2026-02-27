import * as React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { ScreenContent } from './ScreenContent';
import type { ScreenPadding, ScreenProps, ScreenPreset } from './types';

function resolvePreset(preset: ScreenPreset | undefined, legacyScroll: boolean | undefined): ScreenPreset {
  if (preset) {
    return preset;
  }
  if (typeof legacyScroll === 'boolean') {
    return legacyScroll ? 'scroll' : 'fixed';
  }
  return 'scroll';
}

const paddingByKey: Record<ScreenPadding, keyof ReturnType<typeof useTheme>['spacing']> = {
  none: 'xxs',
  sm: 'sm',
  md: 'md',
  lg: 'lg'
};

function ScreenComponent({
  children,
  preset,
  scroll,
  safeTop = true,
  safeBottom = true,
  backgroundColor,
  padding = 'md',
  keyboardBehavior,
  keyboardVerticalOffset = 0,
  header,
  footer,
  style,
  contentStyle,
  contentContainerStyle,
  showsVerticalScrollIndicator = false
}: ScreenProps): React.JSX.Element {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const resolvedPreset = resolvePreset(preset, scroll);
  const resolvedPadding = padding === 'none' ? 0 : t.spacing[paddingByKey[padding]];
  const bg = backgroundColor ?? t.colors.background;

  const containerStyle = React.useMemo(
    () => [
      styles.container,
      {
        backgroundColor: bg,
        paddingTop: safeTop ? insets.top : 0,
        paddingBottom: safeBottom ? insets.bottom : 0
      },
      style
    ],
    [bg, insets.bottom, insets.top, safeBottom, safeTop, style]
  );

  const mergedContentStyle = React.useMemo(
    () => [
      styles.content,
      {
        paddingHorizontal: resolvedPadding,
        paddingVertical: resolvedPadding
      },
      contentStyle,
      contentContainerStyle
    ],
    [contentContainerStyle, contentStyle, resolvedPadding]
  );

  return (
    <View style={containerStyle}>
      <StatusBar style="dark" />
      {header}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={keyboardBehavior ?? (Platform.OS === 'ios' ? 'padding' : undefined)}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScreenContent
          preset={resolvedPreset}
          contentContainerStyle={mergedContentStyle}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        >
          {children}
        </ScreenContent>
      </KeyboardAvoidingView>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  flex: {
    flex: 1
  },
  content: {
    flexGrow: 1
  }
});

export const Screen = React.memo(ScreenComponent);
