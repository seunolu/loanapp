import type { TextStyle } from 'react-native';

export const typography = {
  display: { fontSize: 28, fontWeight: '700', lineHeight: 34 } satisfies TextStyle,
  h1: { fontSize: 24, fontWeight: '700', lineHeight: 30 } satisfies TextStyle,
  h2: { fontSize: 18, fontWeight: '600', lineHeight: 24 } satisfies TextStyle,
  title: { fontSize: 22, fontWeight: '700', lineHeight: 28 } satisfies TextStyle,
  subtitle: { fontSize: 17, fontWeight: '600', lineHeight: 23 } satisfies TextStyle,
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 } satisfies TextStyle,
  bodyMuted: { fontSize: 15, fontWeight: '400', lineHeight: 22 } satisfies TextStyle,
  caption: { fontSize: 12, fontWeight: '500', lineHeight: 16 } satisfies TextStyle,
  button: { fontSize: 15, fontWeight: '600', lineHeight: 20 } satisfies TextStyle
} as const;

export type TypographyKey = keyof typeof typography;
