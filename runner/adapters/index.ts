import type { Adapter } from './types';
import { NoMemoryAdapter } from './no-memory';
import { AiMemoryAdapter } from './ai-memory';
import { FutureCandidateAdapter } from './future-candidate';

export * from './types';
export { NoMemoryAdapter } from './no-memory';
export { AiMemoryAdapter } from './ai-memory';
export { FutureCandidateAdapter } from './future-candidate';

const KNOWN_CANDIDATES = ['no-memory', 'ai-memory'] as const;
export type KnownCandidate = (typeof KNOWN_CANDIDATES)[number];

/**
 * Fail-closed candidate resolution: an unrecognized candidate name is a hard
 * error, never silently treated as no-memory.
 */
export function resolveAdapter(candidate: string, opts: { aiMemoryDataDir?: string } = {}): Adapter {
  if (candidate === 'no-memory') {
    return new NoMemoryAdapter();
  }
  if (candidate === 'ai-memory') {
    if (!opts.aiMemoryDataDir) {
      throw new Error('ai-memory candidate requires an isolated aiMemoryDataDir.');
    }
    return new AiMemoryAdapter({ dataDir: opts.aiMemoryDataDir });
  }
  return new FutureCandidateAdapter(candidate);
}
