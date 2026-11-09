import React, { type ReactNode, useSyncExternalStore } from 'react';
import type { ComponentType } from 'react';
import type {
  DebugMenuApi,
  DebugPlugin,
  DebugThemeConfig,
  DebugTriggers,
} from '../types';

const emptyPlugin = (id: string, title: string): DebugPlugin => ({
  id,
  title,
  component: (() => null) as ComponentType,
});

function NoopProvider({
  children,
}: {
  enabled?: boolean;
  plugins?: DebugPlugin[];
  theme?: DebugThemeConfig;
  triggers?: DebugTriggers;
  children: ReactNode;
}) {
  return <>{children}</>;
}

const noopApi: DebugMenuApi = {
  push: () => undefined,
  back: () => undefined,
  close: () => undefined,
  open: (_pageId?: string, _params?: Record<string, unknown>) => undefined,
  params: {},
};

export function useDebugMenu(): DebugMenuApi {
  return noopApi;
}

export const DebugMenu = {
  open: (_pageId?: string, _params?: Record<string, unknown>) => undefined,
  close: () => undefined,
  TapTrigger: ({
    children,
  }: {
    count?: number;
    windowMs?: number;
    onTrigger?: () => void;
    children: ReactNode;
  }) => <>{children}</>,
};

export const DebugMenuProvider = NoopProvider;
export const TapTrigger = DebugMenu.TapTrigger;
export function useTapTrigger(_options?: unknown): () => void {
  return () => undefined;
}

export const Page = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const Header = () => null;
export const ListItem = () => null;
export const Row = ListItem;
export const Button = () => null;
export const Section = ({ children }: { children?: ReactNode }) => (
  <>{children}</>
);
export const Text = ({ children }: { children?: ReactNode }) => <>{children}</>;

export function createDebugLog(_options?: unknown) {
  const getAll = () => [];
  const subscribe = (_listener: () => void) => () => undefined;
  return {
    log: (_entry?: unknown) => undefined,
    clear: () => undefined,
    getAll,
    subscribe,
    useEntries: () => useSyncExternalStore(subscribe, getAll, getAll),
    plugin: emptyPlugin('log', 'Log'),
  };
}

export const eventsLog = createDebugLog();

export function networkPlugin(_options?: unknown) {
  return emptyPlugin('network', 'Network');
}
export function startNetworkLogging(_options?: unknown) {}
export function clearNetworkLogs() {}
export function getNetworkRequests<T = unknown>(): T[] {
  return [];
}

export function convexPlugin(_options?: unknown) {
  return emptyPlugin('convex', 'Convex');
}
export const loggedWebSocket: typeof WebSocket =
  typeof WebSocket !== 'undefined'
    ? WebSocket
    : (undefined as unknown as typeof WebSocket);
export function withConvexLogging<T>(Base: T): T {
  return Base;
}
export function getConvexEvents<T = unknown>(): T[] {
  return [];
}
export function clearConvexEvents() {}

export function environmentPlugin(_options?: unknown) {
  return emptyPlugin('environment', 'Environment');
}

export function featureFlagsPlugin(_options?: unknown) {
  return emptyPlugin('feature-flags', 'Feature flags');
}

export function infoPlugin(_options?: unknown) {
  return emptyPlugin('info', 'Info');
}

export function actionsPlugin(_options?: unknown) {
  return emptyPlugin('actions', 'Actions');
}

export function subscribeToShake(_onShake: () => void, _options?: unknown) {
  return () => undefined;
}

export function withDebugMenu<T>(metroConfig: T, _options?: unknown) {
  return metroConfig;
}

export type {
  DebugPlugin,
  DebugThemeConfig,
  DebugTriggers,
  DebugMenuApi,
} from '../types';
