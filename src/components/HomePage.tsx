import React, { useMemo } from 'react';
import { useDebugMenu, useDebugPlugins } from '../menuContext';
import { Button, Page, Section, Text } from './primitives';
import type { DebugPlugin } from '../types';

function groupPlugins(plugins: DebugPlugin[]) {
  const sorted = [...plugins].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const groups = new Map<string, DebugPlugin[]>();
  for (const plugin of sorted) {
    const section = plugin.section ?? 'General';
    const list = groups.get(section) ?? [];
    list.push(plugin);
    groups.set(section, list);
  }
  return [...groups.entries()];
}

export function HomePage() {
  const plugins = useDebugPlugins();
  const menu = useDebugMenu();
  const groups = useMemo(() => groupPlugins(plugins), [plugins]);

  return (
    <Page title="Debug">
      {groups.length === 0 ? (
        <Text muted>No plugins registered.</Text>
      ) : (
        groups.map(([section, items]) => (
          <Section key={section} title={section}>
            {items.map((plugin) => {
              const badge = plugin.badge?.();
              return (
                <Button
                  key={plugin.id}
                  label={
                    badge != null ? `${plugin.title} (${badge})` : plugin.title
                  }
                  icon={plugin.icon}
                  onPress={() => menu.push(plugin.id)}
                />
              );
            })}
          </Section>
        ))
      )}
    </Page>
  );
}
