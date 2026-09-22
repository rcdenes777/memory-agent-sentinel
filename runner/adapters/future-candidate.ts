import type { Adapter, RunSessionOptions, SessionInvocationResult } from './types';

/**
 * Pluggable slot for a future memory-system candidate (e.g. Hindsight).
 *
 * Per the review instructions this benchmark must NOT install or optimize
 * for any specific future candidate. This class exists so the runner's
 * candidate registry has a real, typed extension point: implement the
 * `Adapter` interface (see types.ts) and register it in adapters/index.ts to
 * wire in a new system. Until then it fails loudly rather than silently
 * behaving like no-memory or ai-memory.
 */
export class FutureCandidateAdapter implements Adapter {
  constructor(readonly name: string) {}

  async runSession(_opts: RunSessionOptions): Promise<SessionInvocationResult> {
    throw new Error(
      `NOT_IMPLEMENTED: candidate "${this.name}" has no adapter implementation. ` +
        'Implement the Adapter interface (runner/adapters/types.ts) and register it in runner/adapters/index.ts.'
    );
  }
}
