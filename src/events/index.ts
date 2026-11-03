import { createDebugLog } from '../log';

export type AnalyticsDebugEventInput = {
  name: string;
  params?: Record<string, unknown>;
  channels?: string[];
};

export const eventsLog = createDebugLog<AnalyticsDebugEventInput>({
  id: 'events',
  title: 'Analytics events',
  section: 'Inspect',
  order: 20,
  getTitle: (entry) => entry.name,
  getSubtitle: (entry) => {
    if (!entry.params) return undefined;
    try {
      return JSON.stringify(entry.params);
    } catch {
      return undefined;
    }
  },
  getTags: (entry) => entry.channels,
});
