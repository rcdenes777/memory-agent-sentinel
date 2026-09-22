# Baseline Runbook

Instructions for running real baseline measurements of the Memory Sentinel
V1 benchmark. Every baseline run makes real `claude -p` calls and consumes
real API usage/cost — there is no dry-run or simulated mode.

## Prerequisites

- Node.js 18+
- npm
- Git
- The `claude` CLI (Claude Code) installed and authenticated
  (`claude -p "hi" --output-format json` should succeed before running a baseline)
- For the `ai-memory` candidate only: the `ai-memory` binary reachable via
  `$AI_MEMORY_BIN` (or on `PATH`), and a running hook server reachable via
  `$AI_MEMORY_SERVER_URL` (defaults to `http://127.0.0.1:49374`)

## Setup

```bash
cd memory-agent-sentinel
npm install
npm run setup:fixtures   # validates fixtures apply cleanly; makes no API calls
```

## Running Baselines

### Baseline A: No External Memory

```bash
npm run baseline:no-memory
```

Drives SESSION_A → SESSION_B → SESSION_C as three independent `claude -p`
process invocations against `fixtures/project-sample`, plus one isolation
probe against `fixtures/project-isolation-b`, with no MCP memory server
registered for the agent.

**Known environmental limitation:** if the machine running this already has
personal lifecycle hooks configured in its own Claude Code user settings
(e.g. a global ai-memory or other integration), those hooks may still fire
for this invocation — hook arrays are additively merged across settings
sources rather than fully replaced by this benchmark's own empty `hooks: {}`
declaration (verified against Claude Code 2.1.280). Every session captures
hook responses and flags `memory_leak_suspected: true` in `session_logs`
when this is detected; check this field before treating a no-memory result
as clean. Running on a machine with no such personal hooks configured
avoids the issue entirely.

**Expected result:** SESSION_C should generally fail S2/S4 (cross-session
recall of the rotation size decided in SESSION_B) and may or may not pass S3
depending on how well the agent reconstructs intent from code alone. This is
the point of the baseline, not a bug.

### Baseline B: Using ai-memory

```bash
npm run baseline:ai-memory
```

Same session flow, but wires ai-memory's lifecycle hooks and its MCP server
into an isolated, run-specific `--data-dir` (never your real memory store).

**Expected result:** should pass S2_CROSS_SESSION_RECALL and beyond, given a
working ai-memory install.

### Adding a future candidate

Implement the `Adapter` interface in `runner/adapters/types.ts` and register
it in `runner/adapters/index.ts`. There is no `--system <name>` flag or
generic "system under test" mode — a real adapter implementation is
required, by design, so a candidate can't be benchmarked without someone
actually wiring up how to run a session against it.

## Running All Baselines

```bash
npm run baseline:all
```

## Understanding Results

Results are saved to `results/` as JSON files named
`<candidate>_<ISO-timestamp>.json`, validated against `RESULT_SCHEMA.json`
before being written. If validation fails, the runner exits with a non-zero
status and prints the validation errors instead of writing the file — there
is no "best effort" partial result.

```bash
npm run view-results     # Summary of all runs in results/
npm run compare-results  # Gate-by-gate comparison of the latest no-memory vs ai-memory run
npm run report:baseline  # Markdown report (reports/baseline_<timestamp>.md) — not HTML;
                          # this benchmark deliberately avoids a weighted/visual "winner" score
```

## Key Fields to Check

1. **gates.S8_CONTEXT_DEPENDENT_CODING_TASK** — requires the agent's own
   TASK_SUCCESS self-report AND an independent `tsc --noEmit` + `jest` run
   inside the fixture's own working copy to agree.
2. **gates.S2_CROSS_SESSION_RECALL / S4_MULTI_HOP_RECALL** — the rotation
   size SESSION_B decided, verbatim, is the one and only ground truth used;
   there is no external fixed answer for this fact.
3. **session_logs[].memory_leak_suspected** — see the environmental
   limitation above.
4. **provenance.benchmark_commit_sha / fixture_sha256** — bind this exact
   result to the exact benchmark code and fixture content that produced it.

## Troubleshooting

### `claude` CLI not authenticated

```bash
claude -p "hi" --output-format json
```

If this fails with "Not logged in", run `claude` interactively once to
authenticate before running a baseline.

### Fixtures fail to apply

```bash
npm run setup:fixtures
```

reports exactly which fixture/overlay failed and why (malformed
`ANSWER_KEY.json`, a missing overlay directory, etc.) without making any API
calls.

### ai-memory candidate fails immediately

Verify the binary and server are reachable:

```bash
"$AI_MEMORY_BIN" --help
curl -sf "${AI_MEMORY_SERVER_URL:-http://127.0.0.1:49374}/" >/dev/null
```

## Validation Rules

Before accepting a baseline result:

- [ ] Result file validates against `RESULT_SCHEMA.json` (enforced automatically —
      the runner refuses to write an invalid file)
- [ ] `metrics.MANUAL_INTERVENTIONS` is `0` (schema-enforced constant; a measured
      run has no human middleware by definition)
- [ ] No gate silently defaulted to PASS — cross-check `gates.*.measurements`
      against the raw `session_logs` if a result looks surprising
- [ ] `session_logs[].memory_leak_suspected` reviewed for the no-memory candidate
- [ ] `git status` in the benchmark repo itself is clean (fixture working copies
      live under a temp directory, never inside this repo)

## Customization

- Edit `prompts/session-{a,b,c}.txt` / `prompts/isolation-probe.txt` to change
  session instructions — keep the exact-phrase tag protocol intact or update
  `runner/grading.ts` to match.
- Edit `runner/config.ts` for the default model, timeout, and fixture selection,
  or pass `--model=<name>` to `runner.ts` to override the model for one run
  (e.g. a cheap smoke-test run before a full baseline).
- Edit `fixtures/project-sample/overlay-session-{b,c}/` to change the
  deterministic between-session evolution.
