import { useEffect, useRef } from 'react';
import type { DebugTriggers } from '../types';

export function useShakeTrigger({
  triggers,
  onShake,
}: {
  triggers?: DebugTriggers;
  onShake: () => void;
}) {
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  useEffect(() => {
    const shake = triggers?.shake;
    if (!shake) return;

    const fire = () => onShakeRef.current();

    if (typeof shake === 'object' && typeof shake.subscribe === 'function') {
      return shake.subscribe(fire);
    }

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void import('../shake')
      .then((mod) => {
        if (cancelled) return;
        unsubscribe = mod.subscribeToShake(fire);
      })
      .catch(() => {
        // expo-sensors optional — ignore missing module
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [triggers]);
}
