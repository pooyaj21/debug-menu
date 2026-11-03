export type WithDebugMenuOptions = {
  enabled: boolean;
};

export function withDebugMenu<T extends Record<string, unknown>>(
  metroConfig: T,
  options: WithDebugMenuOptions,
): T;
