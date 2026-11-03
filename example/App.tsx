import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DebugMenu, DebugMenuProvider, TapTrigger } from '@pj21/debug-menu';
import { eventsLog } from '@pj21/debug-menu/events';
import { networkPlugin, startNetworkLogging } from '@pj21/debug-menu/network';
import { environmentPlugin } from '@pj21/debug-menu/environment';
import { featureFlagsPlugin } from '@pj21/debug-menu/feature-flags';
import { infoPlugin } from '@pj21/debug-menu/info';
import { actionsPlugin } from '@pj21/debug-menu/actions';
import { createDebugLog } from '@pj21/debug-menu/log';

startNetworkLogging({ maxRequests: 50 });

const notesLog = createDebugLog<{ message: string }>({
  id: 'notes',
  title: 'Notes',
  section: 'Inspect',
  order: 15,
  getTitle: (entry) => entry.message,
});

export default function App() {
  const [env, setEnv] = useState('stage');
  const [overrides, setOverrides] = useState<
    Record<string, boolean | undefined>
  >({});
  const [bootCount, setBootCount] = useState(0);

  const plugins = useMemo(
    () => [
      notesLog.plugin,
      eventsLog.plugin,
      networkPlugin(),
      environmentPlugin({
        list: [
          { id: 'prod', label: 'Production', description: 'Live API' },
          { id: 'stage', label: 'Staging' },
          { id: 'local', label: 'Local', description: 'LAN / emulator' },
        ],
        current: () => env,
        onSelect: (id) => setEnv(id),
      }),
      featureFlagsPlugin({
        flags: [
          { key: 'newCheckout', label: 'New checkout' },
          { key: 'darkMode', label: 'Dark mode experiment' },
        ],
        get: (key) => overrides[key],
        set: (key, value) =>
          setOverrides((prev) => ({ ...prev, [key]: value })),
        clear: () => setOverrides({}),
      }),
      infoPlugin({
        items: () => ({
          environment: env,
          bootCount,
          package: '@pj21/debug-menu',
        }),
      }),
      actionsPlugin({
        actions: [
          {
            label: 'Log sample analytics event',
            onPress: () =>
              eventsLog.log({
                name: 'example_event',
                params: { env },
                channels: ['mixpanel'],
              }),
          },
          {
            label: 'Add note',
            onPress: () =>
              notesLog.log({
                message: `Note at ${new Date().toLocaleTimeString()}`,
              }),
          },
          {
            label: 'Increment boot count',
            onPress: () => setBootCount((n) => n + 1),
          },
          {
            label: 'Reset boot count',
            destructive: true,
            confirm: 'Clear boot count?',
            onPress: () => setBootCount(0),
          },
        ],
      }),
    ],
    [env, overrides, bootCount],
  );

  return (
    <DebugMenuProvider
      enabled
      plugins={plugins}
      triggers={{ shake: true }}
      theme={{ mode: 'system' }}
    >
      <SafeAreaView style={styles.root}>
        <StatusBar style="auto" />
        <View style={styles.content}>
          <Text style={styles.title}>debug-menu example</Text>
          <Text style={styles.body}>
            Shake the device, tap Open, or 5-tap the version label.
          </Text>
          <Pressable style={styles.button} onPress={() => DebugMenu.open()}>
            <Text style={styles.buttonLabel}>Open debug menu</Text>
          </Pressable>
          <TapTrigger count={5} windowMs={600}>
            <Text style={styles.version}>v0.1.0 (tap ×5)</Text>
          </TapTrigger>
        </View>
      </SafeAreaView>
    </DebugMenuProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f7f8' },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#111' },
  body: { fontSize: 16, color: '#555', lineHeight: 22 },
  button: {
    marginTop: 8,
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonLabel: { color: '#fff', fontWeight: '600', fontSize: 16 },
  version: { marginTop: 24, color: '#888', textAlign: 'center' },
});
