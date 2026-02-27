import * as React from 'react';
import { Text } from './Text';
import { useTheme } from '../theme';

type IconName = 'chevron-forward' | 'chevron-back' | 'close' | string;

type IconProps = {
  name: IconName;
  size?: number;
  color?: keyof ReturnType<typeof useTheme>['colors'];
};

export function Icon({ name, size = 18, color = 'text' }: IconProps): React.JSX.Element {
  const t = useTheme();
  const glyph = glyphMap[name] ?? '?';
  return (
    <Text style={{ fontSize: size, lineHeight: size + 2, color: t.colors[color], fontWeight: '700' }}>
      {glyph}
    </Text>
  );
}

const glyphMap: Record<string, string> = {
  'chevron-forward': '>',
  'chevron-back': '<',
  close: 'x'
};
