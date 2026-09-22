# Memory Agent Sentinel V1

Vendor-neutral reproducible benchmark for persistent memory/context systems used by autonomous coding agents.

## Overview

This benchmark measures how well autonomous agents can retain, recall, and correctly use contextual information across multiple independent sessions. It focuses on real-world scenarios where an agent must:

1. Capture context from exploratory work
2. Build up understanding across multiple sessions
3. Supersede stale information with fresh updates
4. Connect multiple pieces of information to solve tasks
5. Correctly attribute knowledge to specific project contexts

## Test Scenarios

### SESSION_A: Initial Exploration
- Inspect fixture project structure
- Make one small change to codebase
- Establish several facts about the project (architecture, dependencies, structure)
- **Establish decision X**: A key architectural or design decision (e.g., "use feature flags for rollout")
- Document this session's context

### SESSION_B: Update and Evolution  
- Start from a clean agent session (no external context)
- Update decision X → Y (e.g., "rollout complete, remove feature flags")
- Establish additional facts/observations
- Make another small change to codebase
- Verify that old information (X) no longer interferes with new decision (Y)

### SESSION_C: Synthesis and Task Completion
- Start clean again
- Answer questions requiring facts from both A and B
- Use Y (not stale X) in reasoning
- Perform a small coding task that depends on correct recalled context
- Verify multi-hop recall and absence of stale information

## Success Gates (GATES)

| Gate | Measurement | Success Criteria |
|------|------------|------------------|
| S0_BASELINE_NO_MEMORY | Agent without external memory | Baseline for comparison |
| S1_SESSION_CAPTURE | Agent captures and stores context | Facts recorded accurately |
| S2_CROSS_SESSION_RECALL | Agent recalls facts across sessions | Facts available in new session |
| S3_STALE_SUPERSESSION | Agent correctly supersedes old info | Y used, X not used |
| S4_MULTI_HOP_RECALL | Agent connects A+B facts | Multi-hop reasoning succeeds |
| S5_PROVENANCE_BINDING | Agent tracks context origin | Facts correctly attributed |
| S6_PROJECT_ISOLATION | Multiple projects don't interfere | Context stays in correct scope |
| S7_RESTART_PERSISTENCE | Context survives agent restart | Facts persist through restart |
| S8_CONTEXT_DEPENDENT_CODING_TASK | Agent codes using correct context | Task completed with Y, not X |

## Metrics

### Correctness Metrics
- **TASK_SUCCESS**: Binary - did the agent complete the required task?
- **CORRECT_RECALL**: Count - facts correctly recalled
- **STALE_RECALL**: Count - outdated facts incorrectly used
- **FALSE_RECALL**: Count - facts not established but claimed
- **PROVENANCE_CORRECT**: Count - facts with correct origin attribution
- **MULTIHOP_SUCCESS**: Binary - multi-hop reasoning successful?
- **PROJECT_ISOLATION**: Binary - contexts properly isolated?
- **RESTART_PERSISTENCE**: Binary - context survived restart?

### Resource Metrics
- **TOKENS_INPUT**: Total input tokens used
- **FILES_READ**: Count of files read
- **GREP_CALLS**: Count of grep/search operations
- **TIME_TO_USEFUL_CONTEXT**: Seconds until agent has sufficient context for task
- **MANUAL_INTERVENTION**: Count of times human had to help

## Baselines

Three comparison points:

- **A: No External Memory** - Agent with only in-session context (LLM context window only)
- **B: Existing ai-memory** - Agent using current ai-memory system
- **C: System Under Test** - Future/candidate memory system (tested later)

## Result Format

Per-gate results include:
- PASS/FAIL status
- Raw measurements (counts, durations)
- Machine-readable JSON (RESULT_SCHEMA.json)
- No subjective winner declarations
- No weighted overall scoring

## Constraints

- **HUMAN_MIDDLEWARE=0** during measured runs (except baseline setup)
- No manual handoff of context between agents
- Synthetic deterministic fixtures only (no private data)
- All secrets/credentials excluded from repo
- Runtime target ≤45 minutes per candidate

## Project Structure

```
.
├── SENTINEL_MEMORY_V1.md          (this file)
├── RESULT_SCHEMA.json             (JSON schema for results)
├── BASELINE_RUNBOOK.md            (how to run baseline measurements)
├── fixtures/
│   ├── project-a/                 (sample Node.js + TS project)
│   ├── project-b/                 (alternative fixture)
│   └── FIXTURES.md                (fixture documentation)
├── prompts/
│   ├── session-a.txt              (SESSION_A instructions)
│   ├── session-b.txt              (SESSION_B instructions)
│   ├── session-c.txt              (SESSION_C instructions)
│   └── PROMPTS.md                 (prompt design notes)
├── runner/
│   ├── runner.ts                  (test harness)
│   ├── session.ts                 (session abstraction)
│   └── config.ts                  (configuration)
├── scoring/
│   ├── gates.ts                   (gate evaluation logic)
│   ├── metrics.ts                 (metric calculation)
│   └── schema.ts                  (result type definitions)
├── results/
│   └── .gitkeep                   (results directory, git-tracked as empty)
└── package.json
```

## Running the Benchmark

See BASELINE_RUNBOOK.md for detailed instructions.

Quick start:
```bash
npm install
npm run baseline:no-memory
npm run baseline:ai-memory
```

Results are saved to `results/` as JSON.

## Validation Checklist

- [ ] Static TypeScript validation passes
- [ ] Fixture projects have deterministic structure
- [ ] Prompts are reproducible
- [ ] Runner can execute without external memory product installed
- [ ] Baseline runs complete in <45 minutes
- [ ] Result schema valid against RESULT_SCHEMA.json
- [ ] No secrets/credentials in repo
- [ ] Git history clean (no test artifacts)
