import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Pressable, Text } from '../primitives';
import { useTheme } from '../theme';
import type { ScreenHeaderProps } from './types';

function ScreenHeaderComponent({
  title,
  subtitle,
  leftAction,
  rightAction,
  showBack = false,
  onBackPress,
  variant = 'default',
  divider = false,
  safeTop = true
}: ScreenHeaderProps): React.JSX.Element {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = React.useCallback(() => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    router.back();
  }, [onBackPress, router]);

  const leftNode = leftAction ?? (showBack ? (
    <Pressable
      onPress={handleBack}
      style={[
        styles.iconButton,
        {
          borderColor: t.colors.border,
          borderRadius: t.radius.pill
        }
      ]}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Icon name="chevron-back" color="text" />
    </Pressable>
  ) : (
    <View style={styles.placeholder} />
  ));

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: safeTop ? insets.top + t.spacing.sm : t.spacing.sm,
          paddingHorizontal: t.spacing.md,
          paddingBottom: t.spacing.sm,
          backgroundColor: variant === 'default' ? t.colors.background : 'transparent',
          borderBottomWidth: divider ? 1 : 0,
          borderBottomColor: t.colors.border
        }
      ]}
    >
      <View style={styles.row}>
        {leftNode}
        <View style={styles.center}>
          <Text variant="h2">{title}</Text>
          {subtitle ? (
            <Text variant="caption" color="textMuted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightAction ?? <View style={styles.placeholder} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2
  },
  placeholder: {
    width: 36,
    height: 36
  },
  iconButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

export const ScreenHeader = React.memo(ScreenHeaderComponent);
