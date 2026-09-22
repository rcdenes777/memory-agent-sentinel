# Test Fixtures

Deterministic, synthetic project fixtures for Memory Sentinel benchmarks.

## Fixture: project-sample

A small Node.js + TypeScript + Express service. It is not a single static
tree — it evolves in three deterministic, harness-controlled stages so that
every candidate sees byte-identical starting content for a given session,
regardless of what an agent did in an earlier session.

```
fixtures/project-sample/
├── base/                  Starting content for SESSION_A
├── overlay-session-b/     Files added/changed on top of base/ before SESSION_B
├── overlay-session-c/     Files added/changed on top of that before SESSION_C
└── ANSWER_KEY.json        Deterministic grading keys (see runner/grading.ts)
```

`runner/fixture-evolution.ts` applies these stages by copying `base/` into a
fresh git repository, then overlaying `overlay-session-b/` and committing,
then overlaying `overlay-session-c/` and committing. Each commit is
independent of anything an agent wrote — see prompts/PROMPTS.md's
verification rules (`git show`/`git diff`) for how to audit this by hand.

### Key Facts (discoverable directly from base/, no memory required)

- REST API with Express, TypeScript with strict mode, JWT authentication
- Request logging middleware writes every request to `console.log`
  (`src/middleware/logger.ts`) — this is the concern SESSION_A is expected to
  identify

### What is NOT in any file (must come from session memory)

These are the facts the benchmark actually measures recall of. They are
established only in an agent's own session output (see the exact-phrase
protocol in each `prompts/session-*.txt` and in `prompts/PROMPTS.md`) and are
never written into any fixture file:

- The specific rotation-size-in-MB decision made during SESSION_B
  (`ROTATION_SIZE_MB`) — SESSION_C must recall the exact number SESSION_B
  chose, not a value from a config file.
- Whether the original SESSION_A problem has actually been resolved
  (requires connecting the SESSION_A problem statement to the SESSION_B/C
  code evolution — this is the multi-hop fact).

### Deliberate stale-but-tempting trap

`overlay-session-c/src/middleware/logger.ts` ships with a `TODO` comment
suggesting a revert to `console.log` "for local debugging". A correct
SESSION_C run does not act on it — see the `S3_STALE_SUPERSESSION` gate.

### Session Scenarios

- **SESSION_A**: examine `base/`, identify the console-logging concern, state
  `DECISION_X` and `FACTS_ESTABLISHED`.
- **SESSION_B**: examine the harness-evolved tree (now includes
  `ISSUES.md` describing a production symptom), implement file-based logging
  with rotation, choose and justify a rotation size, state `DECISION_Y`,
  `ROTATION_SIZE_MB`, and `STALE_CONFIRMED`.
- **SESSION_C**: examine the harness-evolved tree (canonical Decision-Y
  implementation, `ISSUES.md` marked resolved, decoy TODO present),
  implement DEBUG-level + structured JSON logging, recall the rotation size,
  and state the full required tag set (see `prompts/session-c.txt`).

## Fixture: project-isolation-b

A second, independent fixture (`fixtures/project-isolation-b/base/`) used
only for the `S6_PROJECT_ISOLATION` gate. It is a different small service
(`billing-worker-service`) with a deliberately confusable-but-distinct
reliability concern (database connection-pool exhaustion, not logging). See
`fixtures/project-isolation-b/ANSWER_KEY.json` for the forbidden-term lists
used to detect cross-project contamination in either direction.

## Determinism Guarantees

- Hardcoded dependency versions (no `^`/`~` semver ranges)
- No native/compiled dependencies (kept out deliberately for reproducibility
  across machines — e.g. `sqlite3` was removed even though it appears in the
  fixture's own README as an unimplemented aspiration, precisely so that
  fixture setup never depends on native module compilation succeeding)
- No external API calls during fixture setup
- All session-to-session evolution is a plain file overlay + git commit,
  never dependent on random values or on what an agent produced

## Adding New Fixtures

1. Create `fixtures/project-{name}/base/` (and, if the fixture needs
   deterministic evolution, `overlay-session-b/` / `overlay-session-c/`)
2. Add `fixtures/project-{name}/ANSWER_KEY.json`
3. Document it here
4. Register it in `runner/config.ts`
