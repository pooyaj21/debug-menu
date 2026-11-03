import React, { useState } from 'react';
import { View } from 'react-native';
import { ListItem, Page, Section, Text } from '../components/primitives';
import { useDebugTheme } from '../theme/ThemeContext';
import type { DebugPlugin } from '../types';

export type EnvironmentItem = {
  id: string;
  label: string;
  description?: string;
};

export type EnvironmentPluginOptions = {
  id?: string;
  title?: string;
  section?: string;
  order?: number;
  list: EnvironmentItem[];
  current: () => string;
  onSelect: (id: string) => void | Promise<void>;
};

export function environmentPlugin(
  options: EnvironmentPluginOptions,
): DebugPlugin {
  // Ids can be opaque (e.g. numeric enums); people read the label.
  const labelOf = (id: string) =>
    options.list.find((item) => item.id === id)?.label ?? id;

  function EnvironmentPage() {
    const theme = useDebugTheme();
    const [, bump] = useState(0);
    const selected = options.current();

    return (
      <Page title={options.title ?? 'Environment'}>
        <Section title="Environments">
          <View>
            {options.list.map((item) => {
              const isSelected = item.id === selected;
              return (
                <ListItem
                  key={item.id}
                  title={item.label}
                  subtitle={item.description}
                  right={
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: theme.colors.text,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected ? (
                        <View
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: theme.colors.text,
                          }}
                        />
                      ) : null}
                    </View>
                  }
                  onPress={() => {
                    void Promise.resolve(options.onSelect(item.id)).then(() =>
                      bump((n) => n + 1),
                    );
                  }}
                />
              );
            })}
          </View>
        </Section>
        <Text muted>Current: {labelOf(selected)}</Text>
      </Page>
    );
  }

  return {
    id: options.id ?? 'environment',
    title: options.title ?? 'Environment',
    section: options.section ?? 'Inspect',
    order: options.order ?? 30,
    badge: () => labelOf(options.current()),
    component: EnvironmentPage,
  };
}
