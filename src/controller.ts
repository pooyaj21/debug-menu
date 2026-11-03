import type { DebugPageParams } from './types';

type Controller = {
  open: (pageId?: string, params?: DebugPageParams) => void;
  close: () => void;
};

let controller: Controller | null = null;

export function registerDebugMenuController(next: Controller): () => void {
  controller = next;
  return () => {
    if (controller === next) {
      controller = null;
    }
  };
}

export const DebugMenu = {
  open(pageId?: string, params?: DebugPageParams) {
    controller?.open(pageId, params);
  },
  close() {
    controller?.close();
  },
};
