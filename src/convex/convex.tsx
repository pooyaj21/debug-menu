import React, {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { Share, TextInput, View } from 'react-native';
import { DebugPressable } from '../components/DebugPressable';
import { Button, ListItem, Page, Text } from '../components/primitives';
import { useDebugMenu } from '../menuContext';
import { useDebugTheme } from '../theme/ThemeContext';
import type { DebugPlugin } from '../types';

export type ConvexPluginOptions = {
  id?: string;
  title?: string;
  section?: string;
  order?: number;
  /** Max entries kept (oldest dropped). Default 200. */
  maxEntries?: number;
  /** Max raw frames kept (oldest dropped). Default 100. */
  maxRawFrames?: number;
};

type Base = { id: string; timestamp: number };

type RequestEntry = Base & {
  kind: 'mutation' | 'action';
  requestId: number;
  udfPath: string;
  componentPath?: string;
  args: unknown;
  status: 'pending' | 'success' | 'error';
  result?: unknown;
  error?: string;
  errorData?: unknown;
  logLines?: string[];
  durationMs?: number;
};

type QueryEntry = Base & {
  kind: 'query';
  queryId: number;
  udfPath: string;
  componentPath?: string;
  args: unknown;
  status: 'loading' | 'ok' | 'error' | 'removed';
  value?: unknown;
  error?: string;
  errorData?: unknown;
  logLines?: string[];
  updates: number;
  lastUpdateAt?: number;
};

type ConnectionEntry = Base & {
  kind: 'connection';
  event:
    | 'open'
    | 'close'
    | 'error'
    | 'connect'
    | 'authenticate'
    | 'auth-error'
    | 'fatal-error'
    | 'event';
  detail?: unknown;
};

export type ConvexDebugEntry = RequestEntry | QueryEntry | ConnectionEntry;

export type ConvexRawFrame = {
  id: string;
  timestamp: number;
  direction: 'out' | 'in';
  type: string;
  data: string;
};

type Message = Record<string, unknown>;

type State = { entries: ConvexDebugEntry[]; frames: ConvexRawFrame[] };

const settings = { maxEntries: 200, maxRawFrames: 100 };
const listeners = new Set<() => void>();
let state: State = { entries: [], frames: [] };
let nextId = 1;
// `${kind}:${requestId}` -> entry id
let pending = new Map<string, string>();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getState = () => state;

/** Recorded Convex traffic, newest first. */
export function getConvexEvents<T = ConvexDebugEntry>(): T[] {
  return state.entries as unknown as T[];
}

/** Raw frames, newest first (not part of the public entry point). */
export function getConvexRawFrames(): ConvexRawFrame[] {
  return state.frames;
}

export function clearConvexEvents(): void {
  state = { entries: [], frames: [] };
  pending = new Map();
  emit();
}

function addEntry(entry: ConvexDebugEntry) {
  state = {
    ...state,
    entries: [entry, ...state.entries].slice(0, settings.maxEntries),
  };
}

function replaceEntry(next: ConvexDebugEntry) {
  state = {
    ...state,
    entries: state.entries.map((entry) =>
      entry.id === next.id ? next : entry,
    ),
  };
}

function addFrame(direction: 'out' | 'in', type: string, data: string) {
  const frame: ConvexRawFrame = {
    id: String(nextId++),
    timestamp: Date.now(),
    direction,
    type,
    data,
  };
  state = {
    ...state,
    frames: [frame, ...state.frames].slice(0, settings.maxRawFrames),
  };
}

function connection(event: ConnectionEntry['event'], detail?: unknown) {
  addEntry({
    id: String(nextId++),
    timestamp: Date.now(),
    kind: 'connection',
    event,
    detail,
  });
}

function findQuery(queryId: number): QueryEntry | undefined {
  return state.entries.find(
    (entry): entry is QueryEntry =>
      entry.kind === 'query' && entry.queryId === queryId,
  );
}

function asLogLines(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.map(String) : undefined;
}

function handleOutgoing(message: Message) {
  switch (message.type) {
    case 'Connect':
      connection('connect', {
        connectionCount: message.connectionCount,
        lastCloseReason: message.lastCloseReason,
      });
      break;
    case 'Authenticate':
      // Never keep `value`: it is a user JWT or admin key.
      connection('authenticate', {
        tokenType: message.tokenType,
        baseVersion: message.baseVersion,
      });
      break;
    case 'Event':
      connection('event', { eventType: message.eventType });
      break;
    case 'Mutation':
    case 'Action': {
      const kind = message.type === 'Mutation' ? 'mutation' : 'action';
      const requestId = Number(message.requestId);
      const key = `${kind}:${requestId}`;
      const resent = state.entries.find(
        (entry) => entry.id === pending.get(key) && entry.kind === kind,
      );
      // Reconnects re-send in-flight requests with the same requestId.
      if (
        resent &&
        resent.kind !== 'connection' &&
        resent.status === 'pending'
      ) {
        break;
      }
      const id = String(nextId++);
      addEntry({
        id,
        timestamp: Date.now(),
        kind,
        requestId,
        udfPath: String(message.udfPath),
        componentPath: message.componentPath as string | undefined,
        args: Array.isArray(message.args) ? message.args[0] : message.args,
        status: 'pending',
      });
      pending.set(key, id);
      break;
    }
    case 'ModifyQuerySet': {
      const modifications = Array.isArray(message.modifications)
        ? (message.modifications as Message[])
        : [];
      modifications.forEach((modification) => {
        const queryId = Number(modification.queryId);
        const existing = findQuery(queryId);
        if (modification.type === 'Add') {
          const udfPath = String(modification.udfPath);
          const componentPath = modification.componentPath as
            string | undefined;
          const args = Array.isArray(modification.args)
            ? modification.args[0]
            : modification.args;
          if (existing && existing.status !== 'removed') {
            // Reconnects re-send Add with the same query ids.
            replaceEntry({ ...existing, udfPath, componentPath, args });
          } else {
            addEntry({
              id: String(nextId++),
              timestamp: Date.now(),
              kind: 'query',
              queryId,
              udfPath,
              componentPath,
              args,
              status: 'loading',
              updates: 0,
            });
          }
        } else if (modification.type === 'Remove' && existing) {
          replaceEntry({ ...existing, status: 'removed' });
        }
      });
      break;
    }
  }
}

function handleResponse(message: Message) {
  const kind = message.type === 'MutationResponse' ? 'mutation' : 'action';
  const key = `${kind}:${Number(message.requestId)}`;
  const id = pending.get(key);
  pending.delete(key);
  const entry = state.entries.find(
    (item): item is RequestEntry => item.id === id && item.kind === kind,
  );
  if (!entry) return;
  const success = message.success === true;
  replaceEntry({
    ...entry,
    status: success ? 'success' : 'error',
    result: success ? message.result : undefined,
    error: success ? undefined : String(message.result),
    errorData: message.errorData,
    logLines: asLogLines(message.logLines),
    durationMs: Date.now() - entry.timestamp,
  });
}

function handleTransition(message: Message) {
  const modifications = Array.isArray(message.modifications)
    ? (message.modifications as Message[])
    : [];
  const now = Date.now();
  modifications.forEach((modification) => {
    const queryId = Number(modification.queryId);
    const existing: QueryEntry = findQuery(queryId) ?? {
      // Query added before the log was cleared.
      id: String(nextId++),
      timestamp: now,
      kind: 'query',
      queryId,
      udfPath: `query #${queryId}`,
      args: undefined,
      status: 'loading',
      updates: 0,
    };
    const isNew = !state.entries.includes(existing);
    let next: QueryEntry;
    if (modification.type === 'QueryUpdated') {
      next = {
        ...existing,
        status: 'ok',
        value: modification.value,
        error: undefined,
        errorData: undefined,
        logLines: asLogLines(modification.logLines),
        updates: existing.updates + 1,
        lastUpdateAt: now,
      };
    } else if (modification.type === 'QueryFailed') {
      next = {
        ...existing,
        status: 'error',
        error: String(modification.errorMessage),
        errorData: modification.errorData,
        logLines: asLogLines(modification.logLines),
        updates: existing.updates + 1,
        lastUpdateAt: now,
      };
    } else if (modification.type === 'QueryRemoved') {
      if (isNew) return;
      next = { ...existing, status: 'removed' };
    } else {
      return;
    }
    if (isNew) addEntry(next);
    else replaceEntry(next);
  });
}

function handleIncoming(message: Message) {
  switch (message.type) {
    case 'Transition':
      handleTransition(message);
      break;
    case 'MutationResponse':
    case 'ActionResponse':
      handleResponse(message);
      break;
    case 'AuthError':
      connection('auth-error', {
        error: message.error,
        authUpdateAttempted: message.authUpdateAttempted,
      });
      break;
    case 'FatalError':
      connection('fatal-error', { error: message.error });
      break;
  }
}

function parse(data: string): Message | null {
  try {
    const value: unknown = JSON.parse(data);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Message)
      : null;
  } catch {
    return null;
  }
}

function describeBinary(data: unknown): string {
  const size = (data as { byteLength?: unknown; size?: unknown } | null) ?? {};
  const bytes =
    typeof size.byteLength === 'number'
      ? size.byteLength
      : typeof size.size === 'number'
        ? size.size
        : undefined;
  return bytes === undefined ? '<binary>' : `<binary ${bytes} bytes>`;
}

function recordOutgoing(data: unknown) {
  if (typeof data !== 'string') {
    addFrame('out', 'binary', describeBinary(data));
    emit();
    return;
  }
  const message = parse(data);
  if (!message) {
    addFrame('out', 'unparsed', data);
    emit();
    return;
  }
  const raw =
    message.type === 'Authenticate' && 'value' in message
      ? JSON.stringify({ ...message, value: '<redacted>' })
      : data;
  addFrame('out', String(message.type), raw);
  handleOutgoing(message);
  emit();
}

type ChunkBuffer = { transitionId: string; chunks: string[] };

function recordIncoming(data: unknown, chunks: { current?: ChunkBuffer }) {
  if (typeof data !== 'string') {
    addFrame('in', 'binary', describeBinary(data));
    emit();
    return;
  }
  const message = parse(data);
  if (!message) {
    addFrame('in', 'unparsed', data);
    emit();
    return;
  }
  if (message.type === 'Ping') return;
  addFrame('in', String(message.type), data);
  if (message.type === 'TransitionChunk') {
    const transitionId = String(message.transitionId);
    const partNumber = Number(message.partNumber);
    const totalParts = Number(message.totalParts);
    let buffer = chunks.current;
    if (partNumber === 0 || buffer?.transitionId !== transitionId) {
      buffer = { transitionId, chunks: [] };
    }
    if (partNumber !== buffer.chunks.length) {
      // Out of order or a mismatched transition: drop it.
      chunks.current = undefined;
    } else {
      buffer.chunks.push(String(message.chunk));
      chunks.current = buffer;
      if (buffer.chunks.length === totalParts) {
        chunks.current = undefined;
        const transition = parse(buffer.chunks.join(''));
        if (transition) handleTransition(transition);
      }
    }
  } else {
    handleIncoming(message);
  }
  emit();
}

function safely(fn: () => void) {
  try {
    fn();
  } catch {
    // Logging must never break the Convex client.
  }
}

/**
 * Wraps a WebSocket class so Convex sync-protocol traffic shows up in the
 * Convex page. Pass the result as ConvexReactClient's `webSocketConstructor`.
 */
export function withConvexLogging(Base: typeof WebSocket): typeof WebSocket {
  class ConvexLoggedWebSocket extends Base {
    constructor(...args: ConstructorParameters<typeof WebSocket>) {
      super(...args);
      const chunks: { current?: ChunkBuffer } = {};
      // Convex assigns onopen/onmessage/onclose itself; listeners stay separate.
      this.addEventListener('open', () =>
        safely(() => connectionEvent('open')),
      );
      this.addEventListener('message', (event: { data?: unknown }) =>
        safely(() => recordIncoming(event.data, chunks)),
      );
      this.addEventListener(
        'close',
        (event: { code?: number; reason?: string }) =>
          safely(() =>
            connectionEvent('close', {
              code: event.code,
              reason: event.reason,
            }),
          ),
      );
      this.addEventListener('error', () =>
        safely(() => connectionEvent('error')),
      );
    }

    send(data: Parameters<WebSocket['send']>[0]) {
      safely(() => recordOutgoing(data));
      super.send(data);
    }
  }
  return ConvexLoggedWebSocket;
}

function connectionEvent(event: ConnectionEntry['event'], detail?: unknown) {
  connection(event, detail);
  emit();
}

/** `WebSocket` with Convex logging; pass as `webSocketConstructor`. */
export const loggedWebSocket: typeof WebSocket =
  typeof WebSocket !== 'undefined'
    ? withConvexLogging(WebSocket)
    : (undefined as unknown as typeof WebSocket);

// UI

type Filter = 'all' | 'query' | 'mutation' | 'action' | 'connection' | 'raw';

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'query', label: 'Queries' },
  { key: 'mutation', label: 'Mutations' },
  { key: 'action', label: 'Actions' },
  { key: 'connection', label: 'Connection' },
  { key: 'raw', label: 'Raw' },
];

function useConvexState() {
  return useSyncExternalStore(subscribe, getState, getState);
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString();
}

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

function byteLength(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code < 0xdc00) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

function shareText(message: string) {
  void Share.share({ message });
}

function entryTitle(entry: ConvexDebugEntry) {
  return entry.kind === 'connection'
    ? `connection: ${entry.event}`
    : entry.udfPath;
}

function entrySubtitle(entry: ConvexDebugEntry) {
  const parts: Array<string | undefined> = [entry.kind];
  if (entry.kind === 'query') {
    parts.push(entry.status, `${entry.updates} updates`);
  } else if (entry.kind !== 'connection') {
    parts.push(
      entry.status,
      entry.durationMs !== undefined ? `${entry.durationMs} ms` : undefined,
    );
  }
  parts.push(formatTime(entry.timestamp));
  return parts.filter(Boolean).join(' · ');
}

function isError(entry: ConvexDebugEntry) {
  return entry.kind === 'connection'
    ? entry.event === 'error' ||
        entry.event === 'auth-error' ||
        entry.event === 'fatal-error'
    : entry.status === 'error';
}

function frameTitle(frame: ConvexRawFrame) {
  return `${frame.direction === 'out' ? '↑' : '↓'} ${frame.type}`;
}

function DetailPage() {
  const menu = useDebugMenu();
  const { entries, frames } = useConvexState();
  const entryId = menu.params.entryId;
  const frameId = menu.params.frameId;
  const entry =
    entryId !== undefined
      ? entries.find((item) => item.id === String(entryId))
      : undefined;
  const frame =
    frameId !== undefined
      ? frames.find((item) => item.id === String(frameId))
      : undefined;

  if (!entry && !frame) {
    return (
      <Page title="Convex">
        <Text muted>Entry not found. It may have been cleared.</Text>
      </Page>
    );
  }

  const title = entry ? entryTitle(entry) : frameTitle(frame!);
  let json: string;
  if (entry) {
    json = stringify(entry);
  } else {
    const data = parse(frame!.data);
    json = stringify({ ...frame, data: data ?? frame!.data });
  }

  return (
    <Page
      title={title}
      right={
        <DebugPressable onPress={() => shareText(json)} hitSlop={8}>
          <Text style={{ fontSize: 16 }}>Share</Text>
        </DebugPressable>
      }
    >
      <Text mono selectable style={{ fontSize: 13 }}>
        {json}
      </Text>
      <Button label="Copy / Share JSON" onPress={() => shareText(json)} />
    </Page>
  );
}

function ListPage({ title }: { title: string }) {
  const theme = useDebugTheme();
  const menu = useDebugMenu();
  const { entries, frames } = useConvexState();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (filter !== 'all' && entry.kind !== filter) return false;
      if (!q) return true;
      const haystack =
        entry.kind === 'connection'
          ? entry.event
          : `${entry.udfPath} ${entry.status}`;
      return haystack.toLowerCase().includes(q);
    });
  }, [entries, filter, query]);

  const filteredFrames = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return frames;
    return frames.filter((frame) => frame.type.toLowerCase().includes(q));
  }, [frames, query]);

  const onClear = useCallback(() => clearConvexEvents(), []);
  const isEmpty = entries.length === 0 && frames.length === 0;
  const raw = filter === 'raw';

  return (
    <Page
      title={title}
      right={
        !isEmpty ? (
          <DebugPressable onPress={onClear} hitSlop={8}>
            <Text style={{ color: theme.colors.primary, fontSize: 16 }}>
              Clear
            </Text>
          </DebugPressable>
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {FILTERS.map((item) => {
          const selected = item.key === filter;
          return (
            <DebugPressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setFilter(item.key)}
              style={{
                borderWidth: 1,
                borderColor: selected
                  ? theme.colors.primary
                  : theme.colors.border,
                backgroundColor: selected
                  ? theme.colors.primary
                  : theme.colors.surface,
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: selected ? theme.colors.onAction : theme.colors.text,
                }}
              >
                {item.label}
              </Text>
            </DebugPressable>
          );
        })}
      </View>
      {raw ? (
        filteredFrames.length === 0 ? (
          <Text muted>No frames yet.</Text>
        ) : (
          <View>
            {filteredFrames.map((frame) => (
              <ListItem
                key={frame.id}
                title={frameTitle(frame)}
                subtitle={`${formatTime(frame.timestamp)} · ${byteLength(frame.data)} B`}
                onPress={() =>
                  menu.push(
                    { component: DetailPage, title: frameTitle(frame) },
                    { frameId: frame.id },
                  )
                }
              />
            ))}
          </View>
        )
      ) : filteredEntries.length === 0 ? (
        <Text muted>No entries yet.</Text>
      ) : (
        <View>
          {filteredEntries.map((entry) => (
            <ListItem
              key={entry.id}
              title={entryTitle(entry)}
              subtitle={entrySubtitle(entry)}
              destructive={isError(entry)}
              onPress={() =>
                menu.push(
                  { component: DetailPage, title: entryTitle(entry) },
                  { entryId: entry.id },
                )
              }
            />
          ))}
        </View>
      )}
    </Page>
  );
}

/**
 * Page listing Convex queries, mutations, actions and connection events
 * captured by `loggedWebSocket` / `withConvexLogging`.
 */
export function convexPlugin(options?: ConvexPluginOptions): DebugPlugin {
  const title = options?.title ?? 'Convex';
  settings.maxEntries = options?.maxEntries ?? 200;
  settings.maxRawFrames = options?.maxRawFrames ?? 100;

  function ConvexPage() {
    return <ListPage title={title} />;
  }

  return {
    id: options?.id ?? 'convex',
    title,
    section: options?.section ?? 'Inspect',
    order: options?.order ?? 11,
    badge: () => {
      const count = state.entries.filter(
        (entry) => entry.kind !== 'connection' && entry.status === 'error',
      ).length;
      return count > 0 ? count : undefined;
    },
    component: ConvexPage,
  };
}
