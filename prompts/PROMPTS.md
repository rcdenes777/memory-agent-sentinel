# Test Prompts

Instructions for autonomous agents in each benchmark session.

## Session Prompt Design

Each session is designed to:
1. Avoid leading the agent toward specific conclusions
2. Require examination of actual code
3. Create verifiable facts that persist across sessions
4. Test both recall and correct application of knowledge

## Session A: Initial Exploration

Objective: Discover project structure, establish baseline facts, and identify a key decision point.

The agent should:
- Examine the project directory structure
- Review package.json dependencies
- Read the README.md
- Examine source code architecture
- Identify logging behavior
- Establish a decision to improve/change logging

## Session B: Update and Evolution

Objective: Update a previous decision and establish new facts while the old decision becomes stale.

The agent should:
- Note previous findings (without external prompting about them)
- Update the logging approach
- Make a concrete code change
- Establish that the old approach is no longer relevant

## Session C: Synthesis and Coding

Objective: Use facts from both prior sessions to complete a non-trivial coding task.

The agent should:
- Answer questions that require facts from Session A
- Answer questions about evolution (A→B transition)
- Use only current state (Y from B, not stale X from A)
- Complete a coding task that depends on correct context

## Reproducibility

Each session prompt is:
- Deterministic (same input → same valid output)
- Fixture-independent (works with any suitable project)
- Not answer-specific (many valid interpretations allowed)
- Verifiable (facts can be checked in code)

## Fact Categories

### Architectural Facts
- Project type and purpose
- Major dependencies
- Code structure and organization
- API design

### Decision Facts
- Problems identified
- Solutions proposed/implemented
- Tradeoffs discussed
- When decisions were made

### Change Facts
- What was modified
- Why it was modified
- When it was modified
- Impact of modifications

## Verification Rules

To verify SESSION_A facts:
- Run `git show` to see what was established
- Check README and code for decisions

To verify SESSION_B facts:
- Run `git diff` to see updates
- Confirm old decision is superseded

To verify SESSION_C facts:
- Run test code to confirm it works
- Check that old facts weren't mistakenly used
