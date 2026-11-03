import React from 'react';
import { Share, View } from 'react-native';
import { Button, ListItem, Page } from '../components/primitives';
import type { DebugPlugin } from '../types';

export type InfoItems =
  | Record<string, string | number | undefined>
  | (() => Record<string, string | number | undefined>);

export type InfoPluginOptions = {
  id?: string;
  title?: string;
  section?: string;
  order?: number;
  items: InfoItems;
};

function resolveItems(items: InfoItems) {
  return typeof items === 'function' ? items() : items;
}

export function infoPlugin(options: InfoPluginOptions): DebugPlugin {
  function InfoPage() {
    const data = resolveItems(options.items);
    const entries = Object.entries(data);
    const allText = entries
      .map(([key, value]) => `${key}: ${value ?? ''}`)
      .join('\n');

    return (
      <Page title={options.title ?? 'Info'}>
        <View>
          {entries.map(([key, value]) => (
            <ListItem
              key={key}
              title={key}
              subtitle={value == null ? '—' : String(value)}
            />
          ))}
        </View>
        <Button
          label="Copy all"
          onPress={() => {
            void Share.share({ message: allText });
          }}
        />
      </Page>
    );
  }

  return {
    id: options.id ?? 'info',
    title: options.title ?? 'Info',
    section: options.section ?? 'Inspect',
    order: options.order ?? 50,
    component: InfoPage,
  };
}
