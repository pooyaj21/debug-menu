import type { ComponentType, ReactNode } from 'react';

export type DebugPageParams = Record<string, unknown>;

export type DebugPlugin = {
  id: string;
  title: string;
  section?: string;
  icon?: ReactNode;
  order?: number;
  badge?: () => string | number | undefined;
  component: ComponentType;
};

export type DebugThemeColors = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  primary: string;
  danger: string;
  border: string;
  /** Filled action buttons (home page entries, `Button`). */
  action: string;
  onAction: string;
};

export type DebugThemeFonts = {
  regular: string;
  /** Family for titles and labels. Defaults to `regular` with weight 500. */
  medium?: string;
  /** Family for section titles. Defaults to `regular` with weight 700. */
  bold?: string;
  mono: string;
};

export type DebugThemeTokens = {
  colors: DebugThemeColors;
  fonts: DebugThemeFonts;
};

export type DebugThemeMode = 'light' | 'dark' | 'system';

export type DebugDirection = 'ltr' | 'rtl' | 'inherit';

export type DebugThemeConfig = {
  mode?: DebugThemeMode;
  colors?: Partial<DebugThemeColors>;
  fonts?: Partial<DebugThemeFonts>;
};

export type ShakeSubscribe = (onShake: () => void) => () => void;

export type DebugTriggers = {
  shake?: boolean | { subscribe: ShakeSubscribe };
};

export type CustomPage = {
  component: ComponentType;
  title: string;
};

export type PushTarget = string | CustomPage;

export type DebugMenuApi = {
  push: (target: PushTarget, params?: DebugPageParams) => void;
  back: () => void;
  close: () => void;
  open: (pageId?: string, params?: DebugPageParams) => void;
  params: DebugPageParams;
};

export type StackEntry = {
  key: string;
  id: string;
  title: string;
  component: ComponentType;
  params: DebugPageParams;
};
