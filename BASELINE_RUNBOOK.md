# Baseline Runbook

Instructions for running baseline measurements of the Memory Sentinel V1 benchmark.

## Prerequisites

- Node.js 18+
- npm or yarn
- TypeScript
- Git
- Claude API key (ANTHROPIC_API_KEY environment variable)

## Setup

```bash
cd memory-agent-sentinel
npm install
```

## Running Baselines

### Baseline A: No External Memory

Measures agent performance with only in-session context (LLM context window).

```bash
npm run baseline:no-memory
```

**What it measures:**
- Agent starting with no prior knowledge
- All context must come from examining the fixture project
- Baseline for comparison
- Typical duration: 12-15 minutes

**Expected result:** Agent can complete SESSION_A and B with only file examination, but SESSION_C (requiring recall across sessions) will fail or show degradation.

### Baseline B: Using ai-memory

Measures agent performance with ai-memory storage system.

```bash
npm run baseline:ai-memory
```

**Prerequisites:**
- ai-memory installed and configured
- ai-memory service running (if applicable)

**What it measures:**
- Cross-session context retention
- Facts recalled from previous sessions
- Ability to supersede stale information
- Typical duration: 12-15 minutes

**Expected result:** Agent should pass S2_CROSS_SESSION_RECALL and beyond, correctly using updated decisions (Y instead of stale X).

### Baseline C: System Under Test

To test a new memory system:

```bash
npm run baseline:test -- --system my-memory-system
```

Replace `my-memory-system` with the candidate system identifier.

## Running All Baselines

```bash
npm run baseline:all
```

This runs A, B, and optionally C (if configured) sequentially.

Typical total duration: 25-35 minutes

## Understanding Results

Results are saved to `results/` directory as JSON files with names like:
- `baseline_no-memory_YYYYMMDD_HHMMSS.json`
- `baseline_ai-memory_YYYYMMDD_HHMMSS.json`

### Viewing Results

```bash
npm run view-results           # Show summary of latest runs
npm run compare-results        # Compare baseline A vs B
```

### Result Structure

Each result file contains:
- `run_id`: Unique run identifier
- `timestamp`: When the run completed
- `candidate`: Which system was tested
- `gates`: PASS/FAIL for each success gate
- `metrics`: Raw measurements (tokens, files read, etc.)
- `session_logs`: Detailed per-session information

## Key Metrics to Watch

1. **TASK_SUCCESS**: Did the agent complete the required coding task?
2. **CORRECT_RECALL**: How many established facts were correctly recalled?
3. **STALE_RECALL**: How many outdated facts were incorrectly used?
4. **TIME_TO_USEFUL_CONTEXT**: How long until the agent had enough context?
5. **S3_STALE_SUPERSESSION**: Critical gate - can agent use Y instead of stale X?

## Troubleshooting

### Agent Cannot Access Fixture Project

Ensure fixture projects exist:
```bash
ls -la fixtures/
```

If missing, run:
```bash
npm run setup:fixtures
```

### Claude API Failures

Check ANTHROPIC_API_KEY is set:
```bash
echo $ANTHROPIC_API_KEY | head -c 10
```

### Session Timeout

If SESSION_C times out or fails, this is expected without memory system. Extend timeout:
```bash
TIMEOUT_SECONDS=300 npm run baseline:no-memory
```

### Memory System Not Found

For ai-memory baseline, verify installation:
```bash
which ai-memory
ai-memory status
```

## Validation Rules

Before accepting a baseline result:

- [ ] All gates are either PASS or FAIL (not INCOMPLETE)
- [ ] MANUAL_INTERVENTIONS = 0
- [ ] Timing < 45 minutes per candidate
- [ ] Result schema validates against RESULT_SCHEMA.json
- [ ] No secrets/credentials in session logs
- [ ] Git state is clean (no uncommitted files from test)

## Comparing Runs

```bash
npm run compare-results baseline_no-memory_*.json baseline_ai-memory_*.json
```

This generates a comparison showing:
- Pass rate per gate
- Metric deltas
- Improvement analysis

## Next Steps

1. Run baseline A to establish no-memory performance
2. Run baseline B to establish ai-memory performance  
3. Compare results
4. Document any differences or unexpected behaviors
5. Run additional iterations if results show high variance

## Customization

To modify test scenarios, edit files in `prompts/`:
- `session-a.txt`: Initial exploration instructions
- `session-b.txt`: Update and evolution instructions
- `session-c.txt`: Synthesis and task instructions

To use different fixture projects, modify `runner/config.ts`.

## Automated Reporting

After running baselines, generate a report:

```bash
npm run report:baseline
```

This creates `reports/baseline_YYYYMMDD_HHMMSS.html` with visualizations and summary.
