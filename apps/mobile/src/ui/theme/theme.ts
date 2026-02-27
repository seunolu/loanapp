import { colors, radius, shadows, spacing, typography } from '../tokens';

export type AppTheme = {
  colors: typeof colors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: typeof shadows;
};

export const lightTheme: AppTheme = {
  colors,
  spacing,
  radius,
  typography,
  shadows
};

export const darkTheme: AppTheme = {
  ...lightTheme
};

export const theme = lightTheme;
