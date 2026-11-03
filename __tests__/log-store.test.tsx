import React from 'react';
import { Text } from 'react-native';
import { createDebugLog } from '../src/log';

describe('createDebugLog', () => {
  it('keeps a ring buffer of maxSize', () => {
    const log = createDebugLog<{ name: string }>({
      id: 'test-log',
      title: 'Test',
      maxSize: 3,
      getTitle: (e) => e.name,
    });

    log.log({ name: 'a' });
    log.log({ name: 'b' });
    log.log({ name: 'c' });
    log.log({ name: 'd' });

    expect(log.getAll().map((e) => e.name)).toEqual(['d', 'c', 'b']);
  });

  it('notifies subscribers and clear resets', () => {
    const log = createDebugLog<{ name: string }>({
      id: 'test-log-2',
      title: 'Test',
      getTitle: (e) => e.name,
    });

    const spy = jest.fn();
    const unsubscribe = log.subscribe(spy);

    log.log({ name: 'one' });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(log.getAll()).toHaveLength(1);

    log.clear();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(log.getAll()).toEqual([]);

    unsubscribe();
    log.log({ name: 'two' });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('exposes a plugin component', () => {
    const log = createDebugLog<{ name: string }>({
      id: 'test-log-3',
      title: 'Events',
      getTitle: (e) => e.name,
    });

    expect(log.plugin.id).toBe('test-log-3');
    expect(log.plugin.title).toBe('Events');
    expect(typeof log.plugin.component).toBe('function');
    // keep React in scope for TSX transform expectations
    expect(<Text>ok</Text>).toBeTruthy();
  });
});
