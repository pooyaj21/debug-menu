import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { Appearance, type ColorSchemeName } from 'react-native';
import type { DebugThemeConfig, DebugThemeTokens } from '../types';
import { resolveTheme } from './theme';

const ThemeContext = createContext<DebugThemeTokens | null>(null);

function useSystemScheme(): 'light' | 'dark' {
  const [scheme, setScheme] = useState<'light' | 'dark'>(() =>
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  );

  useEffect(() => {
    const sub = Appearance.addChangeListener(
      ({ colorScheme }: { colorScheme: ColorSchemeName }) => {
        setScheme(colorScheme === 'dark' ? 'dark' : 'light');
      },
    );
    return () => sub.remove();
  }, []);

  return scheme;
}

export function DebugThemeProvider({
  config,
  children,
}: {
  config?: DebugThemeConfig;
  children: ReactNode;
}) {
  const system = useSystemScheme();
  const mode = config?.mode ?? 'system';
  const scheme = mode === 'system' ? system : mode;
  const value = useMemo(() => resolveTheme(scheme, config), [scheme, config]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useDebugTheme(): DebugThemeTokens {
  const theme = useContext(ThemeContext);
  if (!theme) {
    return resolveTheme(
      Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
    );
  }
  return theme;
}
