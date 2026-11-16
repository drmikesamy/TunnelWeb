import { createLiveBackend } from './live';
import type { Backend } from './types';

export { on } from './bus';
export type { Backend } from './types';

/** Talks to the TunnelWeb host that served this page (`npx tunnelweb`). */
export const backend: Backend = createLiveBackend();
