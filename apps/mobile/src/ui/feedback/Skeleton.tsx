import * as React from 'react';
import { Animated, Easing, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = '100%', height = 16, radius, style }: SkeletonProps): React.JSX.Element {
  const t = useTheme();
  const [opacity] = React.useState(() => new Animated.Value(0.45));

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.95, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius: radius ?? t.radius.sm,
          backgroundColor: t.colors.surfaceMuted,
          opacity
        },
        style
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden'
  }
});

export type { SkeletonProps };
