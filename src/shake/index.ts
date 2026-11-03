export type ShakeOptions = {
  threshold?: number;
  intervalMs?: number;
  cooldownMs?: number;
};

type AccelerometerModule = {
  setUpdateInterval: (ms: number) => void;
  addListener: (
    listener: (data: { x?: number; y?: number; z?: number }) => void,
  ) => { remove: () => void };
};

function loadAccelerometer(): AccelerometerModule | null {
  try {
    // Lazy optional peer — must not be a static import from core.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sensors = require('expo-sensors') as {
      Accelerometer?: AccelerometerModule;
    };
    return sensors.Accelerometer ?? null;
  } catch {
    return null;
  }
}

export function subscribeToShake(
  onShake: () => void,
  options: ShakeOptions = {},
): () => void {
  const { threshold = 3, intervalMs = 100, cooldownMs = 2500 } = options;

  const Accelerometer = loadAccelerometer();
  if (!Accelerometer) {
    return () => undefined;
  }

  Accelerometer.setUpdateInterval(intervalMs);
  let lastShakeAt = 0;

  const sub = Accelerometer.addListener(({ x = 0, y = 0, z = 0 }) => {
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const now = Date.now();
    if (magnitude > threshold && now - lastShakeAt > cooldownMs) {
      lastShakeAt = now;
      onShake();
    }
  });

  return () => sub.remove();
}
