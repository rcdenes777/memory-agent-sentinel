# Memory Agent Sentinel

A vendor-neutral, reproducible benchmark for evaluating persistent memory and
context systems used by autonomous coding agents. It drives real, independent
`claude -p` process invocations against deterministic project fixtures and
grades the result with fail-closed, machine-checkable gates — never a
subjective or LLM-judged score.

## Quick Start

```bash
npm install
npm run setup:fixtures     # validates fixtures apply cleanly, no session runs yet
npm run baseline:no-memory # runs a real end-to-end baseline (costs real API usage)
npm run view-results
```

`npm run baseline:ai-memory` additionally requires a working `ai-memory`
install (binary + running hook server) reachable via `$AI_MEMORY_BIN` /
`$AI_MEMORY_SERVER_URL` — see BASELINE_RUNBOOK.md.

## Documentation

- **[SENTINEL_MEMORY_V1.md](./SENTINEL_MEMORY_V1.md)** - Complete benchmark specification
- **[BASELINE_RUNBOOK.md](./BASELINE_RUNBOOK.md)** - How to run baseline measurements
- **[fixtures/FIXTURES.md](./fixtures/FIXTURES.md)** - Test fixture documentation
- **[prompts/PROMPTS.md](./prompts/PROMPTS.md)** - Session prompt design

## Project Structure

```
.
├── SENTINEL_MEMORY_V1.md          Benchmark specification
├── RESULT_SCHEMA.json             JSON schema for results (strict: additionalProperties false,
│                                  all 9 gates + session_logs + provenance required)
├── BASELINE_RUNBOOK.md            Running baselines
├── fixtures/
│   ├── project-sample/            Primary fixture (base/ + deterministic overlays)
│   ├── project-isolation-b/       Second, independent fixture for S6_PROJECT_ISOLATION
│   └── FIXTURES.md                Fixture documentation
├── prompts/
│   ├── session-a.txt              SESSION_A instructions
│   ├── session-b.txt              SESSION_B instructions
│   ├── session-c.txt              SESSION_C instructions
│   ├── isolation-probe.txt        S6 isolation probe instructions
│   └── PROMPTS.md                 Design notes and grading protocol
├── runner/                        Real executable harness (TypeScript, drives `claude -p`)
│   └── adapters/                  Pluggable candidate adapters (no-memory, ai-memory, future)
├── scoring/                       Fail-closed gate evaluation, metrics aggregation, schema
├── tests/                         Jest unit tests (gates, grading, schema, fixtures)
└── results/                       Output directory
```

## Key Features

- **Real execution** - drives actual `claude -p --output-format stream-json` subprocesses;
  no simulated sessions
- **Fail-closed** - a missing or unparsable measurement produces FAIL or INCOMPLETE,
  never a silent PASS (see scoring/gates.ts)
- **Vendor-neutral** - candidates are a pluggable adapter interface (runner/adapters);
  a future system is wired in by implementing one interface, not by forking the runner
- **Reproducible** - deterministic fixture evolution (base/ + overlays, git-committed at
  each session boundary) guarantees byte-identical starting content per session across
  every candidate; results bind a `benchmark_commit_sha` and `fixture_sha256`
- **9 success gates** (S0–S8) measuring different aspects of memory/context behavior

## What Gets Measured

- Session capture and context retention
- Cross-session recall of a fact that exists nowhere except an agent's own
  prior session output (a chosen rotation-size decision, not a fixed answer key)
- Ability to supersede stale information (with an independent static-code check,
  not just a self-report)
- Multi-hop reasoning across two separate prior sessions
- Provenance and knowledge attribution across a decision-supersession chain
- Context isolation between two independent, deliberately confusable projects
- Context persistence across confirmed-independent process restarts
  (each session is a fresh OS process; the harness verifies distinct `session_id`s)
- Correct application in a coding task, verified independently via `tsc --noEmit`
  and the fixture's own Jest tests — not merely the agent's self-report

## Result Metrics

Each run produces a machine-readable result validated against
[RESULT_SCHEMA.json](./RESULT_SCHEMA.json) before it is written to disk. An
incomplete or malformed result is refused, not written.

- **Gates** - PASS / FAIL / INCOMPLETE per gate, with the measurements behind each verdict
- **Resources** - FILES_READ / GREP_CALLS, parsed from real tool_use events in the
  session transcript (not estimated)
- **Telemetry** - token usage (input/output/cache read/creation), cost, turns,
  duration, all taken verbatim from the `claude` CLI's own JSON output. A field the
  CLI does not expose is recorded as the literal string `"UNAVAILABLE"`, never `0`.

## Grading Method (please read before trusting a result)

Facts that must be recalled across sessions are graded via an exact-phrase
tag protocol embedded in the session prompts (e.g. `ROTATION_SIZE_MB: 8`),
parsed deterministically by `runner/grading.ts`. This is a pattern-matching
grader, not an LLM judge — it trades tolerance for paraphrase against full
reproducibility and auditability. See `prompts/PROMPTS.md` for the full
protocol and its known limitations.

## Development

```bash
npm run build           # Compile TypeScript
npm test                # Run unit tests (gates, grading, schema, fixtures)
npm run lint            # Type check (tsc --noEmit)
npm run setup:fixtures  # Validate fixtures apply cleanly (no session runs, no API cost)
```

## License

MIT
