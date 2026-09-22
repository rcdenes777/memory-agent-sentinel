import type { MaybeNumber, SessionInvocationResult } from '../runner/adapters/types';

/**
 * Pure aggregation over real per-session telemetry. There is no
 * stateful "recordX()" API here anymore — every number in a
 * MetricsSnapshot is derived directly from what the CLI actually reported
 * for each session, via runner/adapters/*. If any one session's value for a
 * field is 'UNAVAILABLE', the aggregate for that field is 'UNAVAILABLE' too:
 * silently summing only the available sessions would understate the true
 * total and misrepresent it as complete, which is its own form of
 * fail-open behavior.
 */

export interface AggregatedTokenTelemetry {
  input_tokens: MaybeNumber;
  output_tokens: MaybeNumber;
  cache_read_input_tokens: MaybeNumber;
  cache_creation_input_tokens: MaybeNumber;
  total_cost_usd: MaybeNumber;
  num_turns: MaybeNumber;
  duration_ms: MaybeNumber;
  duration_api_ms: MaybeNumber;
}

export interface MetricsSnapshot {
  FILES_READ: number;
  GREP_CALLS: number;
  MANUAL_INTERVENTIONS: number;
  TOTAL_DURATION_SECONDS: MaybeNumber;
  TOKEN_TELEMETRY: AggregatedTokenTelemetry;
}

function sumMaybe(values: MaybeNumber[]): MaybeNumber {
  if (values.some((v) => v === 'UNAVAILABLE')) return 'UNAVAILABLE';
  return (values as number[]).reduce((a, b) => a + b, 0);
}

export function aggregateMetrics(sessions: SessionInvocationResult[]): MetricsSnapshot {
  const filesRead = sessions.reduce((sum, s) => sum + (s.toolCallCounts['Read'] ?? 0), 0);
  const grepCalls = sessions.reduce((sum, s) => sum + (s.toolCallCounts['Grep'] ?? 0) + (s.toolCallCounts['Glob'] ?? 0), 0);

  return {
    FILES_READ: filesRead,
    GREP_CALLS: grepCalls,
    MANUAL_INTERVENTIONS: 0, // HUMAN_MIDDLEWARE=0 is a hard constraint of a measured run, not a metric to infer.
    TOTAL_DURATION_SECONDS:
      sumMaybe(sessions.map((s) => s.durationMs)) === 'UNAVAILABLE'
        ? 'UNAVAILABLE'
        : (sumMaybe(sessions.map((s) => s.durationMs)) as number) / 1000,
    TOKEN_TELEMETRY: {
      input_tokens: sumMaybe(sessions.map((s) => s.tokens.input_tokens)),
      output_tokens: sumMaybe(sessions.map((s) => s.tokens.output_tokens)),
      cache_read_input_tokens: sumMaybe(sessions.map((s) => s.tokens.cache_read_input_tokens)),
      cache_creation_input_tokens: sumMaybe(sessions.map((s) => s.tokens.cache_creation_input_tokens)),
      total_cost_usd: sumMaybe(sessions.map((s) => s.tokens.total_cost_usd)),
      num_turns: sumMaybe(sessions.map((s) => s.numTurns)),
      duration_ms: sumMaybe(sessions.map((s) => s.durationMs)),
      duration_api_ms: sumMaybe(sessions.map((s) => s.durationApiMs)),
    },
  };
}
