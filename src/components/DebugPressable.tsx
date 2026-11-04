import React, { type ComponentProps, type ComponentType } from 'react';
import { Pressable as RNPressable } from 'react-native';
import { getGestureHandler } from '../optional';

type Props = ComponentProps<typeof RNPressable>;

/**
 * Prefers react-native-gesture-handler's Pressable when installed so taps are
 * recognised on the UI thread. RN Pressable goes through the JS responder
 * system (Pressability.onStartShouldSetResponder); when the JS thread is busy,
 * grant/measure arrives late, slight finger drift lets ScrollView / another
 * recognizer win, and onPress never fires (instant adb taps with zero drift
 * still can). Fallback keeps cancelable={false} so a granted press is not
 * stolen mid-gesture by a parent ScrollView.
 */
export function DebugPressable({ cancelable, ...props }: Props) {
  const GesturePressable = getGestureHandler()?.Pressable as
    ComponentType<Props> | undefined;
  if (GesturePressable) {
    return <GesturePressable {...props} cancelable={cancelable} />;
  }
  return <RNPressable {...props} cancelable={cancelable ?? false} />;
}
