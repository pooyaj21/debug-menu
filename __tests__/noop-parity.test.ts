import type { ReactNode } from 'react';
import * as noop from '../src/noop';

const EXPECTED_KEYS = [
  'DebugMenu',
  'DebugMenuProvider',
  'TapTrigger',
  'useDebugMenu',
  'Page',
  'Header',
  'ListItem',
  'Row',
  'Button',
  'Section',
  'Text',
  'createDebugLog',
  'eventsLog',
  'networkPlugin',
  'startNetworkLogging',
  'clearNetworkLogs',
  'environmentPlugin',
  'featureFlagsPlugin',
  'infoPlugin',
  'actionsPlugin',
  'subscribeToShake',
  'withDebugMenu',
] as const;

describe('noop entry parity', () => {
  it('exports the full inert API surface', () => {
    for (const key of EXPECTED_KEYS) {
      expect(noop).toHaveProperty(key);
      expect((noop as Record<string, unknown>)[key]).toBeDefined();
    }
  });

  it('provider is a component and menu APIs are inert', () => {
    expect(typeof noop.DebugMenuProvider).toBe('function');
    expect(() => noop.DebugMenu.open('x')).not.toThrow();
    expect(() => noop.DebugMenu.close()).not.toThrow();
    expect(noop.useDebugMenu().params).toEqual({});
    void (null as unknown as ReactNode);
  });

  it('log factory is a no-op', () => {
    const log = noop.createDebugLog({
      id: 'x',
      title: 'X',
      getTitle: () => 'x',
    });
    expect(() => log.log({ name: 'x' })).not.toThrow();
    expect(log.getAll()).toEqual([]);
  });
});
