# Memory Agent Sentinel V1

Vendor-neutral reproducible benchmark for persistent memory/context systems
used by autonomous coding agents.

## Overview

This benchmark measures how well autonomous agents can retain, recall, and
correctly use contextual information across multiple independent process
invocations ("sessions"). It focuses on real-world scenarios where an agent
must:

1. Capture context from exploratory work
2. Build up understanding across multiple sessions
3. Supersede stale information with fresh updates
4. Connect multiple pieces of information to solve tasks
5. Correctly attribute knowledge to specific project contexts
6. Keep unrelated projects' context from bleeding into each other

## Test Scenarios

Each of SESSION_A/B/C is a genuinely independent `claude -p` process
invocation (no shared conversation, no `--resume`) against a deterministic,
harness-evolved fixture (`fixtures/project-sample/`, see FIXTURES.md).

### SESSION_A: Initial Exploration
- Inspect the fixture project (no code changes)
- Identify a specific, technical performance concern in the logging middleware
- State `DECISION_X` and `FACTS_ESTABLISHED` (exact-phrase protocol; see
  `prompts/PROMPTS.md`)

### SESSION_B: Update and Evolution
- Independent process; the fixture has deterministically evolved (a new
  `ISSUES.md` entry, harness-authored, identical for every candidate)
- Implement file-based logging with rotation; choose and justify a specific
  rotation size in MB — this number is the one and only place that fact
  exists outside whatever memory system is under test
- State `DECISION_Y`, `SUPERSEDES`, `ROTATION_SIZE_MB`, `STALE_CONFIRMED`

### SESSION_C: Synthesis and Task Completion
- Independent process; the fixture has deterministically evolved again to
  the canonical Decision-Y implementation, including a deliberately
  "tempting but wrong" stale comment suggesting a revert to console logging
- Recall the exact rotation size decided in SESSION_B (not derivable from
  any file)
- Confirm the SESSION_A problem is resolved (multi-hop: needs both A and B)
- Implement DEBUG-level + structured JSON logging without reverting to the
  stale approach
- State the full required tag set (see `prompts/session-c.txt`)

### ISOLATION_PROBE
- A separate, independent process against a second, unrelated fixture
  (`fixtures/project-isolation-b/`) with deliberately confusable-but-distinct
  facts, run with the same candidate/memory store as the main sessions
- Verifies neither project's facts leak into the other's context

## Success Gates (GATES)

All nine gates are fail-closed: a missing or unparsable measurement produces
`FAIL` or `INCOMPLETE`, never `PASS` (see `scoring/gates.ts`).

| Gate | Measurement | Success Criteria |
|------|------------|------------------|
| S0_BASELINE_NO_MEMORY | Structural marker | Records which comparison point this run represents |
| S1_SESSION_CAPTURE | SESSION_A output | `FACTS_ESTABLISHED` ≥ threshold and `DECISION_X` present |
| S2_CROSS_SESSION_RECALL | SESSION_C vs SESSION_B | The SESSION_B-decided rotation size is recalled exactly in SESSION_C |
| S3_STALE_SUPERSESSION | Self-report + static code check | SESSION_C does not use console logging as the primary sink (independently verified, not just self-reported) |
| S4_MULTI_HOP_RECALL | S2 + `ORIGINAL_PROBLEM_RESOLVED` | Both the SESSION_B fact and the SESSION_A-rooted judgment succeed together |
| S5_PROVENANCE_BINDING | `SUPERSEDED_DECISION_ACKNOWLEDGED` | SESSION_C explicitly acknowledges which decision superseded which |
| S6_PROJECT_ISOLATION | Isolation probe, self-report + keyword scan | No terms from the other fixture appear in either project's session output |
| S7_RESTART_PERSISTENCE | Distinct `session_id`s + S2 | Sessions are confirmed-independent processes AND recall still succeeded |
| S8_CONTEXT_DEPENDENT_CODING_TASK | Self-report + `tsc --noEmit` + `jest` | All signals agree the coding task was actually completed correctly |

## Metrics

- **Resources**: `FILES_READ`, `GREP_CALLS` — real counts parsed from
  `tool_use` events in the session transcript
- **Telemetry**: `TOKEN_TELEMETRY` (input/output/cache tokens, cost, turns,
  duration) taken verbatim from the `claude` CLI's own reported usage. A
  field the CLI does not expose is `"UNAVAILABLE"`, never `0`.
- **MANUAL_INTERVENTIONS**: fixed at `0` — a measured run has none by
  definition (`HUMAN_MIDDLEWARE=0` constraint below)

## Baselines / Candidates

Candidates are a pluggable adapter interface (`runner/adapters/`), not a
fixed list:

- **no-memory** — `runner/adapters/no-memory.ts` — no MCP memory server registered
- **ai-memory** — `runner/adapters/ai-memory.ts` — ai-memory hooks + MCP server,
  isolated `--data-dir` per run
- any future candidate (e.g. Hindsight) — implement `Adapter` and register it;
  `runner/adapters/future-candidate.ts` is an explicit `NOT_IMPLEMENTED` stub,
  not a silent fallback

## Result Format

Machine-readable JSON validated against `RESULT_SCHEMA.json` before it is
ever written to disk (`additionalProperties: false`, all 9 gates and
`session_logs` required, `provenance` binds `benchmark_commit_sha` +
`fixture_sha256`). No subjective winner declarations. No weighted overall
scoring.

## Constraints

- `HUMAN_MIDDLEWARE=0` during measured runs (enforced structurally: the
  runner never pauses for human input mid-session; `MANUAL_INTERVENTIONS`
  is schema-fixed at `0`)
- No manual handoff of context between sessions — each session is an
  independent `claude -p` process
- Synthetic deterministic fixtures only (no private data)
- All secrets/credentials excluded from repo
- Grading is deterministic pattern-matching against an exact-phrase tag
  protocol (see `prompts/PROMPTS.md`), not an LLM judge — a documented
  tradeoff, not an oversight

## Project Structure

```
.
├── SENTINEL_MEMORY_V1.md          (this file)
├── RESULT_SCHEMA.json             (strict JSON schema for results)
├── BASELINE_RUNBOOK.md            (how to run baseline measurements)
├── fixtures/
│   ├── project-sample/            (base/ + deterministic session overlays)
│   ├── project-isolation-b/       (second, independent fixture for S6)
│   └── FIXTURES.md                (fixture documentation)
├── prompts/
│   ├── session-a.txt / session-b.txt / session-c.txt
│   ├── isolation-probe.txt
│   └── PROMPTS.md                 (prompt design + grading protocol)
├── runner/
│   ├── runner.ts                  (CLI entrypoint)
│   ├── session-runner.ts          (orchestrates A/B/C + isolation probe)
│   ├── fixture-evolution.ts       (deterministic overlay application)
│   ├── grading.ts                 (exact-phrase tag extraction)
│   ├── verify-coding-task.ts      (independent static verification for S8)
│   ├── provenance.ts              (commit SHA + fixture SHA-256 binding)
│   ├── config.ts
│   └── adapters/                  (no-memory, ai-memory, future-candidate, shared CLI driver)
├── scoring/
│   ├── gates.ts                   (fail-closed gate evaluation)
│   ├── metrics.ts                 (real telemetry aggregation)
│   └── schema.ts                  (TS types + ajv-backed schema validation)
├── tests/                         (jest: gates, grading, schema, fixtures)
├── results/
│   └── .gitkeep
└── package.json
```

## Running the Benchmark

See BASELINE_RUNBOOK.md. Quick start:

```bash
npm install
npm run setup:fixtures     # no API calls
npm run baseline:no-memory # real API calls
npm run baseline:ai-memory # real API calls, requires ai-memory
```

Results are saved to `results/` as JSON.

## Validation Checklist

- [x] Static TypeScript validation passes (`npm run lint`)
- [x] Fixture projects have deterministic structure (`npm run setup:fixtures`,
      also asserted in `tests/fixtures.test.ts`)
- [x] A second, independent isolation fixture exists and is exercised every run
- [x] Runner can execute a real end-to-end no-memory baseline without any
      external memory product installed
- [x] Result schema rejects an intentionally incomplete result
      (`tests/schema.test.ts`)
- [x] No secrets/credentials in repo
- [ ] Baseline runs complete in a bounded time — not asserted as a hard
      requirement; depends on model/timeout configuration and is reported in
      `metrics.TOTAL_DURATION_SECONDS`, not enforced as a pass/fail gate
