import { Dimensions, Platform, StatusBar } from 'react-native';

type ScreensModule = typeof import('react-native-screens');
type SafeAreaModule = typeof import('react-native-safe-area-context');
type GestureHandlerModule = typeof import('react-native-gesture-handler');

export type Insets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

// Optional peers. Metro needs `transformer.allowOptionalDependencies` for the
// try/require pattern; Expo enables it, `withDebugMenu` enables it for bare RN.
let screens: ScreensModule | null = null;
try {
  screens = require('react-native-screens') as ScreensModule;
} catch {
  screens = null;
}

let safeArea: SafeAreaModule | null = null;
try {
  safeArea = require('react-native-safe-area-context') as SafeAreaModule;
} catch {
  safeArea = null;
}

let gestureHandler: GestureHandlerModule | null = null;
try {
  gestureHandler =
    require('react-native-gesture-handler') as GestureHandlerModule;
} catch {
  gestureHandler = null;
}

export function getScreens(): ScreensModule | null {
  return screens;
}

export function getSafeArea(): SafeAreaModule | null {
  return safeArea;
}

export function getGestureHandler(): GestureHandlerModule | null {
  return gestureHandler;
}

// Rough insets for apps without react-native-safe-area-context.
function useFallbackInsets(): Insets {
  if (Platform.OS === 'android') {
    return { top: StatusBar.currentHeight ?? 0, bottom: 0, left: 0, right: 0 };
  }
  const { height, width } = Dimensions.get('window');
  const notched = Platform.OS === 'ios' && Math.max(height, width) >= 812;
  return notched
    ? { top: 50, bottom: 34, left: 0, right: 0 }
    : { top: 20, bottom: 0, left: 0, right: 0 };
}

const useInsetsImpl: () => Insets = safeArea
  ? safeArea.useSafeAreaInsets
  : useFallbackInsets;

export function useSafeInsets(): Insets {
  return useInsetsImpl();
}
