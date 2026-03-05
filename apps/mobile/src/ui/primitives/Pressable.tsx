import * as React from 'react';
import {
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle
} from 'react-native';
import { useTheme } from '../theme';

type PressableProps = RNPressableProps & {
  activeOpacity?: number;
  disabledOpacity?: number;
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
};

type PressableRef = React.ComponentRef<typeof RNPressable>;

const Pressable = React.forwardRef<PressableRef, PressableProps>(function Pressable(
  {
    activeOpacity = 0.9,
    disabledOpacity = 0.55,
    style,
    disabled,
    ...rest
  },
  ref
): React.JSX.Element {
  useTheme();

  return (
    <RNPressable
      ref={ref}
      disabled={disabled}
      {...rest}
      style={(state) => {
        const base = typeof style === 'function' ? style(state) : style;
        if (disabled) {
          return [base, { opacity: disabledOpacity }];
        }
        if (!state.pressed) {
          return base;
        }
        return [base, { opacity: activeOpacity }];
      }}
    />
  );
});

Pressable.displayName = 'Pressable';

export { Pressable };
export type { PressableProps, PressableRef };
