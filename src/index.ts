import { TapTrigger } from './components/TapTrigger';
import { DebugMenu as DebugMenuController } from './controller';

export { DebugMenuProvider, useDebugMenu } from './context';
export type { DebugMenuProviderProps } from './context';
export { TapTrigger } from './components/TapTrigger';
export {
  Page,
  Header,
  ListItem,
  Row,
  Button,
  Section,
  Text,
} from './components/primitives';
export { useDebugTheme, DebugThemeProvider } from './theme/ThemeContext';
export {
  resolveTheme,
  lightColors,
  darkColors,
  defaultFonts,
} from './theme/theme';

export type {
  DebugPlugin,
  DebugThemeConfig,
  DebugThemeColors,
  DebugThemeFonts,
  DebugThemeTokens,
  DebugThemeMode,
  DebugTriggers,
  DebugMenuApi,
  DebugPageParams,
  PushTarget,
  CustomPage,
  ShakeSubscribe,
} from './types';

export const DebugMenu = Object.assign(DebugMenuController, {
  TapTrigger,
});
