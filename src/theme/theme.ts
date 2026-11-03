import type {
  DebugThemeColors,
  DebugThemeConfig,
  DebugThemeFonts,
  DebugThemeTokens,
} from '../types';

export const lightColors: DebugThemeColors = {
  background: '#ffffff',
  surface: '#f8f8f9',
  text: '#1b1b1b',
  textMuted: '#777777',
  primary: '#382b70',
  danger: '#c03537',
  border: '#e2e2e2',
  action: '#000000',
  onAction: '#ffffff',
};

export const darkColors: DebugThemeColors = {
  background: '#000000',
  surface: '#1c1c1e',
  text: '#f5f5f7',
  textMuted: '#98989f',
  primary: '#9f8bc3',
  danger: '#ff453a',
  border: '#2c2c2e',
  action: '#ffffff',
  onAction: '#000000',
};

export const defaultFonts: DebugThemeFonts = {
  regular: 'System',
  mono: 'Courier',
};

export function resolveTheme(
  scheme: 'light' | 'dark',
  config?: DebugThemeConfig,
): DebugThemeTokens {
  const base = scheme === 'dark' ? darkColors : lightColors;
  return {
    colors: { ...base, ...config?.colors },
    fonts: { ...defaultFonts, ...config?.fonts },
  };
}
