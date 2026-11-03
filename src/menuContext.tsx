import { createContext, useContext } from 'react';
import type { DebugMenuApi, DebugPlugin } from './types';

export const DebugMenuContext = createContext<DebugMenuApi | null>(null);
export const PluginsContext = createContext<DebugPlugin[]>([]);
/** Resolved layout direction of the menu, for direction-aware drawing. */
export const DirectionContext = createContext<'ltr' | 'rtl'>('ltr');

export function useDebugMenu(): DebugMenuApi {
  const value = useContext(DebugMenuContext);
  if (!value) {
    return {
      push: () => undefined,
      back: () => undefined,
      close: () => undefined,
      open: () => undefined,
      params: {},
    };
  }
  return value;
}

export function useDebugPlugins(): DebugPlugin[] {
  return useContext(PluginsContext);
}
