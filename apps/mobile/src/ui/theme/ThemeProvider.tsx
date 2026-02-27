import * as React from 'react';
import { Appearance } from 'react-native';
import { darkTheme, lightTheme, type AppTheme } from './theme';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [mode, setMode] = React.useState<ThemeMode>('system');
  const system = Appearance.getColorScheme() ?? 'light';
  const resolvedMode = mode === 'system' ? system : mode;

  const value = React.useMemo<ThemeContextValue>(() => {
    return {
      theme: resolvedMode === 'dark' ? darkTheme : lightTheme,
      mode,
      resolvedMode,
      setMode
    };
  }, [mode, resolvedMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
