import React from 'react';
import { Pressable, Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { DebugPressable } from '../src/components/DebugPressable';

const mockGetGestureHandler = jest.fn(
  () => null as null | { Pressable: unknown },
);

jest.mock('../src/optional', () => ({
  getScreens: () => null,
  getSafeArea: () => null,
  getGestureHandler: () => mockGetGestureHandler(),
  useSafeInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('DebugPressable', () => {
  let renderer: ReactTestRenderer | null = null;

  afterEach(() => {
    mockGetGestureHandler.mockReset();
    mockGetGestureHandler.mockReturnValue(null);
    if (renderer) {
      act(() => {
        renderer!.unmount();
      });
      renderer = null;
    }
  });

  it('falls back to RN Pressable with cancelable=false by default', () => {
    mockGetGestureHandler.mockReturnValue(null);
    const onPress = jest.fn();

    act(() => {
      renderer = create(
        <DebugPressable onPress={onPress}>
          <Text>Go</Text>
        </DebugPressable>,
      );
    });

    const node = renderer!.root.findByType(Pressable);
    expect(node.props.cancelable).toBe(false);
    node.props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('respects an explicit cancelable override on the fallback', () => {
    mockGetGestureHandler.mockReturnValue(null);

    act(() => {
      renderer = create(
        <DebugPressable cancelable onPress={() => undefined}>
          <Text>Go</Text>
        </DebugPressable>,
      );
    });

    expect(renderer!.root.findByType(Pressable).props.cancelable).toBe(true);
  });

  it('uses gesture-handler Pressable when the optional peer is present', () => {
    const GesturePressable = ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
    }) => (
      <Pressable {...props} testID="gh-pressable">
        {children}
      </Pressable>
    );
    mockGetGestureHandler.mockReturnValue({
      Pressable: GesturePressable,
    });

    const onPress = jest.fn();
    act(() => {
      renderer = create(
        <DebugPressable onPress={onPress}>
          <Text>Go</Text>
        </DebugPressable>,
      );
    });

    const node = renderer!.root.findByProps({ testID: 'gh-pressable' });
    expect(node).toBeTruthy();
    node.props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
