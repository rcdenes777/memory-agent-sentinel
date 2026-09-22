import { execFile } from 'node:child_process';
import type { RunSessionOptions, SessionInvocationResult, SessionTokenTelemetry, HookObservation, MaybeNumber } from './types';

export interface ClaudeCliInvocationOptions extends RunSessionOptions {
  candidate: string;
  /** Settings object merged via --settings. Callers control hook/memory wiring here. */
  settingsOverride: Record<string, unknown>;
  /** Extra MCP config JSON strings passed via --mcp-config (e.g. an ai-memory server entry). */
  mcpConfigs?: string[];
  /** When false, --strict-mcp-config is omitted so mcpConfigs (or inherited config) can register servers. */
  strictMcpConfig?: boolean;
}

function toMaybeNumber(v: unknown): MaybeNumber {
  return typeof v === 'number' && Number.isFinite(v) ? v : 'UNAVAILABLE';
}

/**
 * A hook_response is "trivial" (a plain lifecycle ack, not a memory
 * injection) when its parsed output is exactly `{}` or `{"continue":true}`
 * (in either key order, with no other keys). Anything else — in particular
 * an `additionalContext`/`systemMessage` field, or any other payload — is
 * treated as non-trivial and surfaced as a possible memory leak.
 */
function isTrivialHookOutput(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '{}') return true;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const keys = Object.keys(parsed);
      if (keys.length === 0) return true;
      if (keys.length === 1 && keys[0] === 'continue' && parsed.continue === true) return true;
    }
    return false;
  } catch {
    // Unparsable non-empty output is treated as non-trivial (fail closed).
    return false;
  }
}

export function runClaudeCli(opts: ClaudeCliInvocationOptions): Promise<SessionInvocationResult> {
  const args: string[] = [
    '-p',
    opts.prompt,
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-hook-events',
    '--settings',
    JSON.stringify(opts.settingsOverride),
    '--model',
    opts.model,
  ];

  if (opts.strictMcpConfig !== false) {
    args.push('--strict-mcp-config');
  }
  for (const mcpConfig of opts.mcpConfigs ?? []) {
    args.push('--mcp-config', mcpConfig);
  }

  const startedAtIso = new Date().toISOString();

  return new Promise((resolve) => {
    execFile(
      'claude',
      args,
      { cwd: opts.cwd, timeout: opts.timeoutSeconds * 1000, maxBuffer: 200 * 1024 * 1024 },
      (error, stdout) => {
        const endedAtIso = new Date().toISOString();
        const lines = stdout.split('\n').filter((l) => l.trim().length > 0);

        let resultEvent: any = null;
        const hookObservations: HookObservation[] = [];
        const toolCallCounts: Record<string, number> = {};

        for (const line of lines) {
          let event: any;
          try {
            event = JSON.parse(line);
          } catch {
            continue; // Non-JSON stray output line; ignore rather than crash.
          }
          if (event.type === 'result') {
            resultEvent = event;
          } else if (event.type === 'system' && event.subtype === 'hook_response') {
            const raw = typeof event.output === 'string' ? event.output : JSON.stringify(event.output ?? '');
            hookObservations.push({
              hookName: String(event.hook_name ?? 'UNKNOWN'),
              nonTrivialOutput: !isTrivialHookOutput(raw),
              rawOutput: raw,
            });
          } else if (event.type === 'assistant' && Array.isArray(event.message?.content)) {
            for (const block of event.message.content) {
              if (block?.type === 'tool_use' && typeof block.name === 'string') {
                toolCallCounts[block.name] = (toolCallCounts[block.name] ?? 0) + 1;
              }
            }
          }
        }

        const memoryLeakSuspected = hookObservations.some((h) => h.nonTrivialOutput);

        if (!resultEvent) {
          resolve({
            candidate: opts.candidate,
            sessionLabel: opts.sessionLabel,
            sessionId: 'UNAVAILABLE',
            isError: true,
            resultText: error
              ? `CLI invocation failed: ${error.message}`
              : 'CLI produced no parsable result event.',
            numTurns: 'UNAVAILABLE',
            durationMs: 'UNAVAILABLE',
            durationApiMs: 'UNAVAILABLE',
            tokens: {
              input_tokens: 'UNAVAILABLE',
              output_tokens: 'UNAVAILABLE',
              cache_read_input_tokens: 'UNAVAILABLE',
              cache_creation_input_tokens: 'UNAVAILABLE',
              total_cost_usd: 'UNAVAILABLE',
            },
            toolCallCounts,
            hookObservations,
            memoryLeakSuspected,
            startedAtIso,
            endedAtIso,
          });
          return;
        }

        const usage = resultEvent.usage ?? {};
        const tokens: SessionTokenTelemetry = {
          input_tokens: toMaybeNumber(usage.input_tokens),
          output_tokens: toMaybeNumber(usage.output_tokens),
          cache_read_input_tokens: toMaybeNumber(usage.cache_read_input_tokens),
          cache_creation_input_tokens: toMaybeNumber(usage.cache_creation_input_tokens),
          total_cost_usd: toMaybeNumber(resultEvent.total_cost_usd),
        };

        resolve({
          candidate: opts.candidate,
          sessionLabel: opts.sessionLabel,
          sessionId: typeof resultEvent.session_id === 'string' ? resultEvent.session_id : 'UNAVAILABLE',
          isError: Boolean(resultEvent.is_error),
          resultText: typeof resultEvent.result === 'string' ? resultEvent.result : '',
          numTurns: toMaybeNumber(resultEvent.num_turns),
          durationMs: toMaybeNumber(resultEvent.duration_ms),
          durationApiMs: toMaybeNumber(resultEvent.duration_api_ms),
          tokens,
          toolCallCounts,
          hookObservations,
          memoryLeakSuspected,
          startedAtIso,
          endedAtIso,
        });
      }
    );
  });
}
