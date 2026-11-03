import type { ComponentType } from 'react';
import type {
  CustomPage,
  DebugPageParams,
  DebugPlugin,
  PushTarget,
  StackEntry,
} from '../types';

let keyCounter = 0;

export function createStackKey(): string {
  keyCounter += 1;
  return `stack-${keyCounter}`;
}

export const HOME_ID = '__debug_home__';

export function createHomeEntry(component: ComponentType): StackEntry {
  return {
    key: createStackKey(),
    id: HOME_ID,
    title: 'Debug',
    component,
    params: {},
  };
}

export function resolvePluginEntry(
  plugins: DebugPlugin[],
  pageId: string,
  params: DebugPageParams = {},
): StackEntry | null {
  const plugin = plugins.find((item) => item.id === pageId);
  if (!plugin) return null;
  return {
    key: createStackKey(),
    id: plugin.id,
    title: plugin.title,
    component: plugin.component,
    params,
  };
}

export function resolvePushTarget(
  plugins: DebugPlugin[],
  target: PushTarget,
  params: DebugPageParams = {},
): StackEntry | null {
  if (typeof target === 'string') {
    return resolvePluginEntry(plugins, target, params);
  }
  const page = target as CustomPage;
  return {
    key: createStackKey(),
    id: `custom-${createStackKey()}`,
    title: page.title,
    component: page.component,
    params,
  };
}
