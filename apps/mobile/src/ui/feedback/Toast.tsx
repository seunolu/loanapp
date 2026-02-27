import * as React from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { Text } from '../primitives';
import { useTheme } from '../theme';

type ToastType = 'info' | 'success' | 'error';

type ToastProps = {
  visible: boolean;
  title: string;
  message?: string;
  type?: ToastType;
  durationMs?: number;
  onHide?: () => void;
};

export function Toast({
  visible,
  title,
  message,
  type = 'info',
  durationMs = 2200,
  onHide
}: ToastProps): React.JSX.Element | null {
  const t = useTheme();
  const [opacity] = React.useState(() => new Animated.Value(0));
  const [translateY] = React.useState(() => new Animated.Value(12));

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.timing(translateY, {
          toValue: 12,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true
        })
      ]).start(() => {
        onHide?.();
      });
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs, onHide, opacity, translateY, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: typeStyles(t)[type].bg,
          borderColor: typeStyles(t)[type].border,
          opacity,
          transform: [{ translateY }]
        }
      ]}
    >
      <Text color={typeStyles(t)[type].text} weight="700">
        {title}
      </Text>
      {message ? <Text color={typeStyles(t)[type].text}>{message}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4
  }
});

const typeStyles = (t: ReturnType<typeof useTheme>) => ({
  info: { bg: t.colors.infoSurface, border: t.colors.infoBorder, text: 'info' as const },
  success: { bg: t.colors.successSurface, border: t.colors.successBorder, text: 'success' as const },
  error: { bg: t.colors.dangerSurface, border: t.colors.dangerBorder, text: 'danger' as const }
});

export type { ToastProps, ToastType };
