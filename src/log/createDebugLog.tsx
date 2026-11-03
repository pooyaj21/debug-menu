import React, {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { Pressable, Share, TextInput, View } from 'react-native';
import { Button, ListItem, Page, Text } from '../components/primitives';
import { useDebugMenu } from '../menuContext';
import { useDebugTheme } from '../theme/ThemeContext';
import type { DebugPlugin } from '../types';

export type DebugLogEntryBase = {
  id: string;
  timestamp: number;
};

export type CreateDebugLogOptions<T> = {
  id: string;
  title: string;
  section?: string;
  order?: number;
  maxSize?: number;
  getTitle: (entry: T & DebugLogEntryBase) => string;
  getSubtitle?: (entry: T & DebugLogEntryBase) => string | undefined;
  getTags?: (entry: T & DebugLogEntryBase) => string[] | undefined;
  getTime?: (entry: T & DebugLogEntryBase) => string;
  renderDetail?: (entry: T & DebugLogEntryBase) => React.ReactNode;
  /** Reserved hook for a future persist adapter — unused in 0.1. */
  persist?: unknown;
};

export type DebugLogApi<T> = {
  log: (entry: T) => void;
  clear: () => void;
  getAll: () => Array<T & DebugLogEntryBase>;
  subscribe: (listener: () => void) => () => void;
  useEntries: () => Array<T & DebugLogEntryBase>;
  plugin: DebugPlugin;
};

type Store<T> = {
  entries: Array<T & DebugLogEntryBase>;
  listeners: Set<() => void>;
  nextId: number;
};

function defaultTime(entry: DebugLogEntryBase) {
  return new Date(entry.timestamp).toLocaleTimeString();
}

function shareText(message: string) {
  void Share.share({ message });
}

export function createDebugLog<
  T extends Record<string, unknown> = Record<string, unknown>,
>(options: CreateDebugLogOptions<T>): DebugLogApi<T> {
  const maxSize = options.maxSize ?? 50;
  // persist reserved for future adapter without breaking API
  void options.persist;

  const store: Store<T> = {
    entries: [],
    listeners: new Set(),
    nextId: 1,
  };

  const emit = () => {
    store.listeners.forEach((listener) => listener());
  };

  const getAll = () => store.entries;

  const subscribe = (listener: () => void) => {
    store.listeners.add(listener);
    return () => {
      store.listeners.delete(listener);
    };
  };

  const log = (entry: T) => {
    const next = {
      ...entry,
      id: String(store.nextId++),
      timestamp: Date.now(),
    } as T & DebugLogEntryBase;
    store.entries = [next, ...store.entries].slice(0, maxSize);
    emit();
  };

  const clear = () => {
    store.entries = [];
    emit();
  };

  const useEntries = () => useSyncExternalStore(subscribe, getAll, getAll);

  function DetailPage() {
    const menu = useDebugMenu();
    const entryId = String(menu.params.entryId ?? '');
    const entries = useEntries();
    const entry = entries.find((item) => item.id === entryId);

    if (!entry) {
      return (
        <Page title={options.title}>
          <Text muted>Entry not found. It may have been cleared.</Text>
        </Page>
      );
    }

    const json = JSON.stringify(entry, null, 2);

    return (
      <Page
        title={options.getTitle(entry)}
        right={
          <Pressable onPress={() => shareText(json)} hitSlop={8}>
            <Text style={{ fontSize: 16 }}>Share</Text>
          </Pressable>
        }
      >
        {options.renderDetail ? (
          options.renderDetail(entry)
        ) : (
          <Text mono selectable style={{ fontSize: 13 }}>
            {json}
          </Text>
        )}
        <Button label="Copy / Share JSON" onPress={() => shareText(json)} />
      </Page>
    );
  }

  function ListPage() {
    const theme = useDebugTheme();
    const menu = useDebugMenu();
    const entries = useEntries();
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return entries;
      return entries.filter((entry) => {
        const title = options.getTitle(entry).toLowerCase();
        const subtitle = options.getSubtitle?.(entry)?.toLowerCase() ?? '';
        const tags = (options.getTags?.(entry) ?? []).join(' ').toLowerCase();
        return title.includes(q) || subtitle.includes(q) || tags.includes(q);
      });
    }, [entries, query]);

    const onClear = useCallback(() => clear(), []);

    return (
      <Page
        title={options.title}
        right={
          entries.length > 0 ? (
            <Pressable onPress={onClear} hitSlop={8}>
              <Text style={{ color: theme.colors.primary, fontSize: 16 }}>
                Clear
              </Text>
            </Pressable>
          ) : undefined
        }
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search"
          placeholderTextColor={theme.colors.textMuted}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />
        {filtered.length === 0 ? (
          <Text muted>No entries yet.</Text>
        ) : (
          <View>
            {filtered.map((entry) => {
              const tags = options.getTags?.(entry);
              const time = (options.getTime ?? defaultTime)(entry);
              const subtitleParts = [
                options.getSubtitle?.(entry),
                tags && tags.length > 0 ? tags.join(' · ') : undefined,
                time,
              ].filter(Boolean);
              return (
                <ListItem
                  key={entry.id}
                  title={options.getTitle(entry)}
                  subtitle={subtitleParts.join(' · ')}
                  onPress={() =>
                    menu.push(
                      { component: DetailPage, title: options.getTitle(entry) },
                      { entryId: entry.id },
                    )
                  }
                />
              );
            })}
          </View>
        )}
      </Page>
    );
  }

  const plugin: DebugPlugin = {
    id: options.id,
    title: options.title,
    section: options.section ?? 'Inspect',
    order: options.order,
    badge: () => {
      const count = store.entries.length;
      return count > 0 ? count : undefined;
    },
    component: ListPage,
  };

  return { log, clear, getAll, subscribe, useEntries, plugin };
}
