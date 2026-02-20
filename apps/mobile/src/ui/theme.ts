export const colors = {
  background: '#F3F7FB',
  bg: '#F3F7FB',
  surface: '#FFFFFF',
  surface2: '#F8FAFC',
  surfaceMuted: '#F8FAFC',
  border: '#DDE6EE',
  text: '#0B1F33',
  muted: '#5E7286',
  textMuted: '#5E7286',
  textInverse: '#FFFFFF',
  primary: '#0A4A7A',
  primaryText: '#FFFFFF',
  primaryPressed: '#083B62',
  secondary: '#E8F1F8',
  success: '#0F7B6C',
  warning: '#B76C0A',
  danger: '#C0352E',
  info: '#2B6CB0',
  infoSurface: '#E7F0FB',
  successSurface: '#E6F5F2',
  warningSurface: '#FFF4E5',
  dangerSurface: '#FDECEA'
} as const;

export const spacing = {
  xxs: 2,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999
} as const;

export const typography = {
  display: { fontSize: 28, fontWeight: '700' as const },
  title: { fontSize: 22, fontWeight: '700' as const },
  subtitle: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  button: { fontSize: 15, fontWeight: '600' as const }
} as const;

export const theme = { colors, spacing, radius, typography } as const;
