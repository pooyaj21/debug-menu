import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import {
  clearConvexEvents,
  convexPlugin,
  getConvexEvents,
  withConvexLogging,
  type ConvexDebugEntry,
} from '../src/convex';
import { getConvexRawFrames } from '../src/convex/convex';

jest.mock('../src/optional', () => ({
  getScreens: () => null,
  getSafeArea: () => null,
  getGestureHandler: () => null,
  useSafeInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

type Listener = (event: Record<string, unknown>) => void;

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  listeners: Record<string, Listener[]> = {};
  sent: unknown[] = [];
  url: string;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: Listener) {
    (this.listeners[type] ??= []).push(listener);
  }

  send(data: unknown) {
    this.sent.push(data);
  }

  emit(type: string, event: Record<string, unknown> = {}) {
    (this.listeners[type] ?? []).forEach((listener) => listener(event));
  }

  receive(message: unknown) {
    this.emit('message', {
      data: typeof message === 'string' ? message : JSON.stringify(message),
    });
  }
}

const LoggedSocket = withConvexLogging(
  FakeWebSocket as unknown as typeof WebSocket,
);

function connect() {
  const ws = new LoggedSocket('wss://example.convex.cloud');
  return ws as unknown as FakeWebSocket & { send: (data: unknown) => void };
}

function out(ws: { send: (data: unknown) => void }, message: unknown) {
  ws.send(JSON.stringify(message));
}

function only<K extends ConvexDebugEntry['kind']>(kind: K) {
  return getConvexEvents().filter(
    (entry): entry is Extract<ConvexDebugEntry, { kind: K }> =>
      entry.kind === kind,
  );
}

type Node = { props: Record<string, unknown> };

function texts(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAll((node: Node) => typeof node.props.children === 'string')
    .map((node: Node) => node.props.children as string);
}

let now = 1_000;

beforeEach(() => {
  now = 1_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  convexPlugin();
  clearConvexEvents();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('withConvexLogging', () => {
  it('pairs a mutation with its response and measures duration', () => {
    const ws = connect();
    out(ws, {
      type: 'Mutation',
      requestId: 0,
      udfPath: 'messages:send',
      args: [{ body: 'hi' }],
    });
    expect(only('mutation')[0]).toMatchObject({
      status: 'pending',
      udfPath: 'messages:send',
      args: { body: 'hi' },
    });

    now = 1_250;
    ws.receive({
      type: 'MutationResponse',
      requestId: 0,
      success: true,
      result: 'id1',
      ts: 'AAAA',
      logLines: ['ok'],
    });
    const [mutation] = only('mutation');
    expect(only('mutation')).toHaveLength(1);
    expect(mutation).toMatchObject({
      status: 'success',
      result: 'id1',
      durationMs: 250,
      logLines: ['ok'],
    });
  });

  it('keeps one entry for a mutation re-sent after a reconnect', () => {
    const mutation = {
      type: 'Mutation',
      requestId: 1,
      udfPath: 'messages:send',
      args: [{}],
    };
    const response = {
      type: 'MutationResponse',
      requestId: 1,
      success: true,
      result: null,
      ts: 'AAAA',
      logLines: [],
    };
    const first = connect();
    out(first, mutation);
    first.emit('close', { code: 1006, reason: 'gone' });
    const second = connect();
    out(second, mutation);
    second.receive(response);
    expect(only('mutation')).toHaveLength(1);
    expect(only('mutation')[0]).toMatchObject({ status: 'success' });

    // A duplicate answer for a completed request is ignored.
    second.receive({ ...response, success: false, result: 'late' });
    expect(only('mutation')).toHaveLength(1);
    expect(only('mutation')[0]).toMatchObject({ status: 'success' });
  });

  it('records a failed action', () => {
    const ws = connect();
    out(ws, { type: 'Action', requestId: 3, udfPath: 'ai:run', args: [{}] });
    ws.receive({
      type: 'ActionResponse',
      requestId: 3,
      success: false,
      result: 'boom',
      logLines: [],
      errorData: { code: 1 },
    });
    expect(only('action')[0]).toMatchObject({
      status: 'error',
      error: 'boom',
      errorData: { code: 1 },
    });
    expect(convexPlugin().badge?.()).toBe(1);
  });

  it('tracks a query through updates and removal', () => {
    const ws = connect();
    out(ws, {
      type: 'ModifyQuerySet',
      baseVersion: 0,
      newVersion: 1,
      modifications: [
        { type: 'Add', queryId: 7, udfPath: 'messages:list', args: [{}] },
      ],
    });
    expect(only('query')[0]).toMatchObject({ status: 'loading', updates: 0 });

    const update = (value: unknown) =>
      ws.receive({
        type: 'Transition',
        startVersion: {},
        endVersion: {},
        modifications: [
          {
            type: 'QueryUpdated',
            queryId: 7,
            value,
            logLines: [],
            journal: null,
          },
        ],
      });
    update([1]);
    update([1, 2]);
    expect(only('query')[0]).toMatchObject({
      status: 'ok',
      value: [1, 2],
      updates: 2,
    });

    out(ws, {
      type: 'ModifyQuerySet',
      baseVersion: 1,
      newVersion: 2,
      modifications: [{ type: 'Remove', queryId: 7 }],
    });
    expect(only('query')).toHaveLength(1);
    expect(only('query')[0]!.status).toBe('removed');
  });

  it('does not duplicate a query re-added after a reconnect', () => {
    const add = (ws: { send: (data: unknown) => void }) =>
      out(ws, {
        type: 'ModifyQuerySet',
        baseVersion: 0,
        newVersion: 1,
        modifications: [
          { type: 'Add', queryId: 1, udfPath: 'tasks:get', args: [{ a: 1 }] },
        ],
      });
    add(connect());
    add(connect());
    expect(only('query')).toHaveLength(1);
  });

  it('reassembles a chunked transition', () => {
    const ws = connect();
    out(ws, {
      type: 'ModifyQuerySet',
      baseVersion: 0,
      newVersion: 1,
      modifications: [
        { type: 'Add', queryId: 2, udfPath: 'big:list', args: [{}] },
      ],
    });
    const transition = JSON.stringify({
      type: 'Transition',
      startVersion: {},
      endVersion: {},
      modifications: [
        {
          type: 'QueryUpdated',
          queryId: 2,
          value: 'large',
          logLines: [],
          journal: null,
        },
      ],
    });
    const half = Math.floor(transition.length / 2);
    [transition.slice(0, half), transition.slice(half)].forEach(
      (chunk, partNumber) =>
        ws.receive({
          type: 'TransitionChunk',
          chunk,
          partNumber,
          totalParts: 2,
          transitionId: 't1',
        }),
    );
    expect(only('query')[0]).toMatchObject({ status: 'ok', value: 'large' });
  });

  it('ignores Ping frames', () => {
    const ws = connect();
    ws.receive({ type: 'Ping' });
    expect(getConvexEvents()).toEqual([]);
    expect(getConvexRawFrames()).toEqual([]);
  });

  it('never stores the auth token', () => {
    const ws = connect();
    const message = JSON.stringify({
      type: 'Authenticate',
      tokenType: 'User',
      value: 'secret.jwt.token',
      baseVersion: 0,
    });
    ws.send(message);
    expect(ws.sent).toEqual([message]);
    expect(JSON.stringify(getConvexEvents())).not.toContain('secret');
    expect(JSON.stringify(getConvexRawFrames())).not.toContain('secret');
    expect(only('connection')[0]).toMatchObject({
      event: 'authenticate',
      detail: { tokenType: 'User', baseVersion: 0 },
    });
  });

  it('passes the original data to the base send', () => {
    const ws = connect();
    const message = JSON.stringify({
      type: 'Mutation',
      requestId: 1,
      udfPath: 'a:b',
      args: [{}],
    });
    ws.send(message);
    expect(ws.sent).toEqual([message]);
  });

  it('survives malformed frames', () => {
    const ws = connect();
    expect(() => ws.receive('{not json')).not.toThrow();
    expect(() => ws.send('{not json')).not.toThrow();
    expect(() => ws.receive({ type: 'Transition' })).not.toThrow();
    expect(getConvexRawFrames().map((frame) => frame.type)).toEqual([
      'Transition',
      'unparsed',
      'unparsed',
    ]);
  });

  it('records socket lifecycle events', () => {
    const ws = connect();
    ws.emit('open');
    ws.emit('close', { code: 1006, reason: 'gone' });
    expect(only('connection').map((entry) => entry.event)).toEqual([
      'close',
      'open',
    ]);
    expect(only('connection')[0]!.detail).toEqual({
      code: 1006,
      reason: 'gone',
    });
  });

  it('clears entries and pairing state', () => {
    const ws = connect();
    out(ws, { type: 'Mutation', requestId: 9, udfPath: 'a:b', args: [{}] });
    clearConvexEvents();
    expect(getConvexEvents()).toEqual([]);
    expect(getConvexRawFrames()).toEqual([]);
    ws.receive({
      type: 'MutationResponse',
      requestId: 9,
      success: true,
      result: null,
      ts: 'AAAA',
      logLines: [],
    });
    expect(getConvexEvents()).toEqual([]);
  });

  it('caps entries at maxEntries', () => {
    convexPlugin({ maxEntries: 3 });
    const ws = connect();
    [1, 2, 3, 4, 5].forEach((requestId) =>
      out(ws, {
        type: 'Mutation',
        requestId,
        udfPath: `m:${requestId}`,
        args: [{}],
      }),
    );
    expect(
      getConvexEvents().map(
        (entry) => entry.kind === 'mutation' && entry.udfPath,
      ),
    ).toEqual(['m:5', 'm:4', 'm:3']);
  });
});

describe('convexPlugin', () => {
  it('renders recorded mutations', () => {
    const plugin = convexPlugin();
    const ws = connect();
    out(ws, {
      type: 'Mutation',
      requestId: 1,
      udfPath: 'messages:send',
      args: [{}],
    });
    let renderer: ReactTestRenderer | null = null;
    act(() => {
      renderer = create(<plugin.component />);
    });
    expect(texts(renderer!)).toEqual(
      expect.arrayContaining(['Convex', 'messages:send']),
    );
    act(() => renderer!.unmount());
  });
});
