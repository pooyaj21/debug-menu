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

export function TapTrigger({
  count = 5,
  windowMs = 600,
  onTrigger,
  style,
  children,
}: TapTriggerProps) {
  const tapCount = useRef(0);
  const lastTapAt = useRef(0);

  const onPress = useCallback(() => {
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

  return (
    <Pressable onPress={onPress} style={style}>
      {children}
    </Pressable>
  );
}
