import type { BackendEvents } from './types';

type Handler<K extends keyof BackendEvents> = (payload: BackendEvents[K]) => void;
const listeners = new Map<keyof BackendEvents, Set<(payload: never) => void>>();

/** Stores subscribe here; backends emit here. */
export function on<K extends keyof BackendEvents>(event: K, handler: Handler<K>): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  const set = listeners.get(event) as Set<Handler<K>>;
  set.add(handler);
  return () => set.delete(handler);
}

export function emit<K extends keyof BackendEvents>(event: K, payload: BackendEvents[K]) {
  (listeners.get(event) as Set<Handler<K>> | undefined)?.forEach((h) => h(payload));
}
