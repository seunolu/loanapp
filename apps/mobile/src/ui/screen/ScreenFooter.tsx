import * as React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

type ScreenFooterProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

function ScreenFooterComponent({ children, style }: ScreenFooterProps): React.JSX.Element {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.base,
        {
          borderTopColor: t.colors.border,
          backgroundColor: t.colors.surface,
          paddingHorizontal: t.spacing.md,
          paddingTop: t.spacing.sm,
          paddingBottom: t.spacing.sm + insets.bottom
        },
        t.shadows.sm,
        style
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderTopWidth: 1
  }
});

export const ScreenFooter = React.memo(ScreenFooterComponent);
export type { ScreenFooterProps };
