import React from 'react';
import { act, create } from 'react-test-renderer';
import { useTapTrigger } from '../src';
import { getNetworkRequests } from '../src/network';

function Probe({
  onReady,
  onTrigger,
}: {
  onReady: (onPress: () => void) => void;
  onTrigger: () => void;
}) {
  onReady(useTapTrigger({ count: 3, windowMs: 600, onTrigger }));
  return null;
}

describe('useTapTrigger', () => {
  afterEach(() => jest.restoreAllMocks());

  it('fires after `count` taps inside the window, then resets', () => {
    let now = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const onTrigger = jest.fn();
    let onPress: () => void = () => undefined;

    act(() => {
      create(<Probe onReady={(fn) => (onPress = fn)} onTrigger={onTrigger} />);
    });

    onPress();
    now += 100;
    onPress();
    expect(onTrigger).not.toHaveBeenCalled();
    now += 100;
    onPress();
    expect(onTrigger).toHaveBeenCalledTimes(1);

    // A slow tap starts a new series.
    now += 100;
    onPress();
    now += 1000;
    onPress();
    now += 100;
    onPress();
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });
});

describe('getNetworkRequests', () => {
  it('returns an array even when nothing was logged', () => {
    expect(Array.isArray(getNetworkRequests())).toBe(true);
  });
});
