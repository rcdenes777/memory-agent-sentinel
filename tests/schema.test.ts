import { validateResult, type SentinelResult } from '../scoring/schema';

function completeResult(): SentinelResult {
  const gateResult = { status: 'PASS' as const, details: 'ok', measurements: {} };
  return {
    run_id: '11111111-1111-1111-1111-111111111111',
    timestamp: new Date().toISOString(),
    benchmark_version: '1.0.0',
    candidate: 'no-memory',
    environment: {
      node_version: process.version,
      platform: 'linux-x64',
      agent_model: 'sonnet',
      memory_system_version: null,
    },
    provenance: {
      benchmark_commit_sha: 'a'.repeat(40),
      fixture_sha256: 'b'.repeat(64),
    },
    gates: {
      S0_BASELINE_NO_MEMORY: gateResult,
      S1_SESSION_CAPTURE: gateResult,
      S2_CROSS_SESSION_RECALL: gateResult,
      S3_STALE_SUPERSESSION: gateResult,
      S4_MULTI_HOP_RECALL: gateResult,
      S5_PROVENANCE_BINDING: gateResult,
      S6_PROJECT_ISOLATION: gateResult,
      S7_RESTART_PERSISTENCE: gateResult,
      S8_CONTEXT_DEPENDENT_CODING_TASK: gateResult,
    },
    metrics: {
      FILES_READ: 3,
      GREP_CALLS: 1,
      MANUAL_INTERVENTIONS: 0,
      TOTAL_DURATION_SECONDS: 120,
      TOKEN_TELEMETRY: {
        input_tokens: 100,
        output_tokens: 200,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        total_cost_usd: 0.01,
        num_turns: 4,
        duration_ms: 120000,
        duration_api_ms: 90000,
      },
    },
    session_logs: [
      { session_label: 'SESSION_A', session_id: 's1', is_error: false, started_at: new Date().toISOString(), ended_at: new Date().toISOString(), memory_leak_suspected: false },
    ],
    notes: 'test',
  };
}

describe('RESULT_SCHEMA validation', () => {
  it('accepts a complete, well-formed result', () => {
    const outcome = validateResult(completeResult());
    expect(outcome.valid).toBe(true);
    expect(outcome.errors).toEqual([]);
  });

  it('rejects a result missing session_logs entirely', () => {
    const bad: any = completeResult();
    delete bad.session_logs;
    const outcome = validateResult(bad);
    expect(outcome.valid).toBe(false);
  });

  it('rejects a result missing a required gate (incomplete gate coverage)', () => {
    const bad: any = completeResult();
    delete bad.gates.S6_PROJECT_ISOLATION;
    const outcome = validateResult(bad);
    expect(outcome.valid).toBe(false);
  });

  it('rejects a gate_result missing the required "measurements" field', () => {
    const bad: any = completeResult();
    delete bad.gates.S1_SESSION_CAPTURE.measurements;
    const outcome = validateResult(bad);
    expect(outcome.valid).toBe(false);
  });

  it('rejects a gate status value outside the allowed enum (e.g. a fabricated "PARTIAL")', () => {
    const bad: any = completeResult();
    bad.gates.S1_SESSION_CAPTURE.status = 'PARTIAL';
    const outcome = validateResult(bad);
    expect(outcome.valid).toBe(false);
  });

  it('rejects a result missing provenance (cannot bind the result to a benchmark commit/fixture)', () => {
    const bad: any = completeResult();
    delete bad.provenance;
    const outcome = validateResult(bad);
    expect(outcome.valid).toBe(false);
  });

  it('rejects an unknown top-level field (additionalProperties: false)', () => {
    const bad: any = completeResult();
    bad.overall_score = 0.9;
    const outcome = validateResult(bad);
    expect(outcome.valid).toBe(false);
  });

  it('rejects token telemetry silently defaulted to 0 with a wrong type (must be number or UNAVAILABLE)', () => {
    const bad: any = completeResult();
    bad.metrics.TOKEN_TELEMETRY.input_tokens = null;
    const outcome = validateResult(bad);
    expect(outcome.valid).toBe(false);
  });
});
