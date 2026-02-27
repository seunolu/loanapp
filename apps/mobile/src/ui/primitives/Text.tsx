import * as React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '../theme';

type TextVariant = 'display' | 'h1' | 'h2' | 'body' | 'bodyMuted' | 'caption' | 'title' | 'subtitle' | 'button';
type TextWeight = NonNullable<TextStyle['fontWeight']>;

type TextProps = RNTextProps & {
  variant?: TextVariant;
  weight?: TextWeight;
  color?: keyof ReturnType<typeof useTheme>['colors'];
  style?: TextStyle | TextStyle[];
};

export function Text({ variant = 'body', weight, color, style, ...rest }: TextProps): React.JSX.Element {
  const t = useTheme();
  const resolvedColor = color ?? (variant === 'bodyMuted' ? 'textMuted' : 'text');
  return <RNText style={[t.typography[variant], { color: t.colors[resolvedColor] }, weight ? { fontWeight: weight } : null, style]} {...rest} />;
}
