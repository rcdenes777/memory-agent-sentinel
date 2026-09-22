// Adapter interface for pluggable memory-system candidates.
//
// A=no external memory, B=existing ai-memory, C=future candidate (e.g.
// Hindsight — not implemented; see future-candidate.ts). Every adapter must
// drive a REAL, independent process per session (a genuine restart boundary)
// and report REAL telemetry. Fields that are not exposed by the underlying
// process must be reported as the literal string 'UNAVAILABLE', never as 0
// or false — silently defaulting missing telemetry to zero is exactly the
// kind of fail-open bug this rewrite exists to remove.

export type MaybeNumber = number | 'UNAVAILABLE';

export interface SessionTokenTelemetry {
  input_tokens: MaybeNumber;
  output_tokens: MaybeNumber;
  cache_read_input_tokens: MaybeNumber;
  cache_creation_input_tokens: MaybeNumber;
  total_cost_usd: MaybeNumber;
}

export interface HookObservation {
  hookName: string;
  nonTrivialOutput: boolean;
  rawOutput: string;
}

export interface SessionInvocationResult {
  candidate: string;
  sessionLabel: string;
  sessionId: string | 'UNAVAILABLE';
  isError: boolean;
  resultText: string;
  numTurns: MaybeNumber;
  durationMs: MaybeNumber;
  durationApiMs: MaybeNumber;
  tokens: SessionTokenTelemetry;
  /** Real per-tool invocation counts, parsed from stream-json tool_use blocks. */
  toolCallCounts: Record<string, number>;
  hookObservations: HookObservation[];
  /**
   * True only when independent evidence (a hook_response payload beyond a
   * trivial `{}`/`{"continue":true}` ack) suggests a memory/context system
   * injected content into this session. For the no-memory candidate this
   * must be surfaced, never suppressed, even though it reflects an
   * environmental limitation rather than a benchmark design flaw.
   */
  memoryLeakSuspected: boolean;
  startedAtIso: string;
  endedAtIso: string;
}

export interface RunSessionOptions {
  cwd: string;
  prompt: string;
  sessionLabel: string;
  model: string;
  timeoutSeconds: number;
}

export interface Adapter {
  readonly name: string;
  runSession(opts: RunSessionOptions): Promise<SessionInvocationResult>;
}
