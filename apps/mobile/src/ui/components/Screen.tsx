import * as React from 'react';
import { SafeAreaView, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, spacing } from '../theme';

type ScreenProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function Screen({ children, style }: ScreenProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.content, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md }
});

