import React from 'react';
import { View } from 'react-native';
import { Page, Text } from '../components/primitives';
import type { DebugPlugin } from '../types';

export type NetworkPluginOptions = {
  id?: string;
  title?: string;
  section?: string;
  order?: number;
  compact?: boolean;
};

type NetworkLoggerModule = {
  default: React.ComponentType<{ compact?: boolean }>;
  startNetworkLogging?: (options?: Record<string, unknown>) => void;
  clearRequests?: () => void;
};

function loadNetworkLogger(): NetworkLoggerModule | null {
  try {
    // Optional peer — absent installs must not crash the menu.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-network-logger') as NetworkLoggerModule;
  } catch {
    return null;
  }
}

export function startNetworkLogging(options?: Record<string, unknown>): void {
  const mod = loadNetworkLogger();
  mod?.startNetworkLogging?.(options);
}

export function clearNetworkLogs(): void {
  const mod = loadNetworkLogger();
  mod?.clearRequests?.();
}

function MissingNetworkLogger() {
  return (
    <Page title="Network">
      <Text muted>
        Install `react-native-network-logger` to use the network plugin.
      </Text>
    </Page>
  );
}

export function networkPlugin(options: NetworkPluginOptions = {}): DebugPlugin {
  const title = options.title ?? 'Network';
  const compact = options.compact ?? true;

  function NetworkPage() {
    const mod = loadNetworkLogger();
    if (!mod?.default) {
      return <MissingNetworkLogger />;
    }
    const Logger = mod.default;
    return (
      <Page title={title} scroll={false}>
        <View style={{ flex: 1 }}>
          <Logger compact={compact} />
        </View>
      </Page>
    );
  }

  return {
    id: options.id ?? 'network',
    title,
    section: options.section ?? 'Inspect',
    order: options.order ?? 10,
    component: NetworkPage,
  };
}
