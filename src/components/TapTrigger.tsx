import React, { useCallback, useRef, type ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { DebugMenu } from '../controller';

export type TapTriggerProps = {
  count?: number;
  windowMs?: number;
  onTrigger?: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export type TapTriggerOptions = {
  count?: number;
  windowMs?: number;
  onTrigger?: () => void;
};

/**
 * Returns an `onPress` that opens the menu (or calls `onTrigger`) after `count`
 * taps, each within `windowMs` of the last. For rows that take a callback.
 */
export function useTapTrigger({
  count = 5,
  windowMs = 600,
  onTrigger,
}: TapTriggerOptions = {}): () => void {
  const tapCount = useRef(0);
  const lastTapAt = useRef(0);

  return useCallback(() => {
    const now = Date.now();
    tapCount.current =
      now - lastTapAt.current < windowMs ? tapCount.current + 1 : 1;
    lastTapAt.current = now;
    if (tapCount.current >= count) {
      tapCount.current = 0;
      if (onTrigger) onTrigger();
      else DebugMenu.open();
    }
  }, [count, windowMs, onTrigger]);
}

export function TapTrigger({
  count,
  windowMs,
  onTrigger,
  style,
  children,
}: TapTriggerProps) {
  const onPress = useTapTrigger({ count, windowMs, onTrigger });

  return (
    <Pressable onPress={onPress} style={style}>
      {children}
    </Pressable>
  );
}
