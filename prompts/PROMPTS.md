# Test Prompts

Instructions for autonomous agents in each benchmark session, and the
deterministic grading protocol used to score their output.

## Session Prompt Design

Each session is designed to:
1. Require examination of actual code
2. Create verifiable facts that persist across sessions
3. Test both recall and correct application of knowledge
4. Never instruct the agent to ignore or avoid using a memory/context system
   it has access to — an earlier version of these prompts did exactly that
   ("Do NOT reference prior sessions... Rely only on code examination"),
   which actively defeated the benchmark's purpose by telling every
   candidate, including memory-enabled ones, not to use memory. That
   instruction has been removed.

## Grading Protocol (exact-phrase tags)

Facts that a later session must recall are graded deterministically, not by
an LLM judge. Each session prompt requires the agent to end its final
message with specific `TAG_NAME: value` lines. `runner/grading.ts` extracts
these with a line-anchored regex (`^TAG_NAME:\s*(.+)$`, case-insensitive
flag on, multiline).

**Why exact phrases instead of free-text plus an LLM judge:** reproducibility
and auditability. A pattern-matching grader produces the same verdict for
the same transcript every time and its logic fits in one small, reviewed
file. The known cost is reduced tolerance for a correct answer phrased
unexpectedly — a future version could add an LLM-judge scorer as an
alternative, but that is out of scope for v1 and would need its own
reliability validation before being trusted for gating.

**Why the rotation size has no fixed external answer:** SESSION_B is free to
choose any rotation size it can justify — there is no "correct" number. The
benchmark instead checks whether SESSION_C recalls the SAME number SESSION_B
actually chose, extracted from SESSION_B's own transcript. This is what
makes S2/S4 a genuine cross-session recall test rather than a lookup against
a hint hidden somewhere the agent could stumble onto without memory.

### Session A tags
- `DECISION_X` — one sentence, problem + proposed direction
- `FACTS_ESTABLISHED` — integer

### Session B tags
- `DECISION_Y`, `SUPERSEDES`, `ROTATION_SIZE_MB` (integer, chosen freely),
  `STALE_CONFIRMED` (YES/NO)

### Session C tags
- `CURRENT_DECISION`, `ORIGINAL_PROBLEM_RESOLVED` (YES/NO),
  `SUPERSEDED_DECISION_ACKNOWLEDGED` (YES/NO), `USED_STALE_APPROACH` (YES/NO),
  `ROTATION_SIZE_MB` (integer or `UNKNOWN`), `TASK_SUCCESS` (YES/NO)

### Isolation probe tags
- `OBSERVED_DECISION_TOPIC`, `ISOLATION_PROBE_LEAK` (YES/NO)

A missing or unparsable tag is graded as `MISSING`, which — per
`scoring/gates.ts` — can only ever produce `FAIL` or `INCOMPLETE` downstream,
never a passing result.

## Verification Rules

To verify SESSION_A facts:
- Run `git show` in the session's working copy (each session's own file
  changes are committed by `runner/fixture-evolution.ts` after it runs,
  separately from the harness's own deterministic evolution commits)

To verify SESSION_B facts:
- Run `git diff` between the `session-b-start` and `session-b-agent-output`
  commits to see what the agent actually changed
- Confirm `ROTATION_SIZE_MB` in the transcript matches what the code implies

To verify SESSION_C facts:
- `npx tsc --noEmit` and `npx jest` inside the working copy (this is exactly
  what `runner/verify-coding-task.ts` does automatically for the
  S8_CONTEXT_DEPENDENT_CODING_TASK gate)
- Confirm the stale console-logging TODO in the code was not acted on
