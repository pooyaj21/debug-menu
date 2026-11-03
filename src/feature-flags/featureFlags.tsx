import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Page, Section, Text } from '../components/primitives';
import { useDebugTheme } from '../theme/ThemeContext';
import type { DebugPlugin } from '../types';

export type FeatureFlagItem = {
  key: string;
  label?: string;
};

export type FeatureFlagsPluginOptions = {
  id?: string;
  title?: string;
  section?: string;
  order?: number;
  flags: FeatureFlagItem[];
  get: (key: string) => boolean | undefined;
  set: (key: string, value: boolean | undefined) => void;
  clear: () => void;
};

const CHOICES: Array<{ label: string; value: boolean | undefined }> = [
  { label: 'Auto', value: undefined },
  { label: 'On', value: true },
  { label: 'Off', value: false },
];

export function featureFlagsPlugin(
  options: FeatureFlagsPluginOptions,
): DebugPlugin {
  function FeatureFlagsPage() {
    const theme = useDebugTheme();
    const [, bump] = useState(0);
    const refresh = () => bump((n) => n + 1);

    return (
      <Page title={options.title ?? 'Feature flags'}>
        <Section note="Auto uses the app default. On/Off force a debug override.">
          <View style={{ gap: 12 }}>
            {options.flags.map((flag) => {
              const override = options.get(flag.key);
              return (
                <View
                  key={flag.key}
                  style={{
                    gap: 8,
                    padding: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  }}
                >
                  <Text style={{ fontWeight: '600' }}>
                    {flag.label ?? flag.key}
                  </Text>
                  <Text muted style={{ fontSize: 12 }}>
                    {flag.key} · override{' '}
                    {override === undefined ? 'auto' : override ? 'on' : 'off'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {CHOICES.map((choice) => {
                      const selected = override === choice.value;
                      return (
                        <Pressable
                          key={choice.label}
                          onPress={() => {
                            options.set(flag.key, choice.value);
                            refresh();
                          }}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 8,
                            borderWidth: 1,
                            alignItems: 'center',
                            borderColor: selected
                              ? theme.colors.text
                              : theme.colors.border,
                            backgroundColor: selected
                              ? theme.colors.text
                              : 'transparent',
                          }}
                        >
                          <Text
                            style={{
                              color: selected ? '#ffffff' : theme.colors.text,
                            }}
                          >
                            {choice.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        </Section>
        <Button
          label="Clear all overrides"
          onPress={() => {
            options.clear();
            refresh();
          }}
        />
      </Page>
    );
  }

  return {
    id: options.id ?? 'feature-flags',
    title: options.title ?? 'Feature flags',
    section: options.section ?? 'Controls',
    order: options.order ?? 40,
    component: FeatureFlagsPage,
  };
}
