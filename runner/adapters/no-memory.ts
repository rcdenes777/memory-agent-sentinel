import type { Adapter, RunSessionOptions, SessionInvocationResult } from './types';
import { runClaudeCli } from './claude-cli';

/**
 * Baseline A: no external memory.
 *
 * This adapter registers no MCP servers (so no memory_query/memory_recent/
 * memory_briefing tools are ever available to the agent) and declares an
 * empty hooks object in its own settings layer.
 *
 * KNOWN LIMITATION (disclosed, not hidden): on a machine that already has
 * personal lifecycle hooks configured in user-level settings (e.g. an
 * ai-memory or gobby install), those hooks may still fire for this
 * invocation, because hook arrays are additively merged across settings
 * sources rather than replaced by a single source's empty declaration —
 * verified empirically against Claude Code 2.1.280. This adapter cannot
 * unilaterally strip another settings source's hooks without touching
 * shared global configuration outside this benchmark's control, which this
 * benchmark does not do automatically.
 *
 * To compensate, every session captures hook_response payloads via
 * `--include-hook-events` and flags `memoryLeakSuspected` when any hook
 * returns more than a trivial acknowledgement. Callers MUST check this flag
 * per session and surface it — never assume isolation is perfect just
 * because this is "the no-memory adapter".
 */
export class NoMemoryAdapter implements Adapter {
  readonly name = 'no-memory';

  async runSession(opts: RunSessionOptions): Promise<SessionInvocationResult> {
    return runClaudeCli({
      ...opts,
      candidate: this.name,
      settingsOverride: { model: opts.model, hooks: {} },
      strictMcpConfig: true,
    });
  }
}
