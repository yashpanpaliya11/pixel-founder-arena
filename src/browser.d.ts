import type { Snapshot, ArenaEvent } from './index.js';
export { founders, classifyError, errorGuides, chooseRoast, createDebate, topics } from './index.js';
export interface BrowserDemoTransport {
  snapshot(): Snapshot;
  subscribe(onState: (state: Snapshot) => void, onEvent?: (event: ArenaEvent) => void): () => void;
  request(path: string, body?: Record<string, unknown>): Promise<Snapshot>;
}
export function createBrowserDemo(options?: { storage?: Pick<Storage, 'getItem' | 'setItem'>; storageKey?: string }): BrowserDemoTransport;
