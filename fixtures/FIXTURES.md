# Test Fixtures

Deterministic, synthetic project fixtures for Memory Sentinel benchmarks.

## Fixture: project-sample

A realistic Node.js + TypeScript microservice project.

### Structure

```
project-sample/
├── src/
│   ├── index.ts
│   ├── config.ts
│   ├── server.ts
│   ├── services/
│   │   ├── auth.ts
│   │   └── users.ts
│   └── middleware/
│       └── logger.ts
├── tests/
│   ├── auth.test.ts
│   └── users.test.ts
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

### Key Facts for Testing

**Architecture Facts:**
- REST API with Express
- TypeScript with strict mode
- JWT authentication
- SQLite database
- Request logging middleware

**Dependencies:**
- express 4.18.x
- typescript 5.1.x
- jest for testing
- sqlite3 for database

**Known Issue (for SESSION_A):**
- Current implementation logs all requests to console
- Decision X: "Performance concern: logging to console in production"

**Update (for SESSION_B):**
- Decision Y: "Switch to file-based logging with rotation"
- Implement log level configuration

### Session Scenarios

#### SESSION_A: Initial Exploration
Agent should:
1. Examine project structure
2. Identify tech stack (Express, TypeScript, SQLite)
3. Identify the performance concern (console logging)
4. Establish Decision X: "Need to address console logging in production"
5. Note current middleware implementation in src/middleware/logger.ts

#### SESSION_B: Update and Evolution
Agent should:
1. Understand previous context about console logging issue
2. Update to Decision Y: "Implement file-based logging"
3. Add log level support in config.ts
4. Update logger middleware to use file instead of console
5. Verify Decision X (console logging) is no longer valid

#### SESSION_C: Synthesis
Agent should:
1. Answer: "What logging strategy is currently implemented?" → file-based (Y, not console X)
2. Ask: "Why was logging changed?" → reference both A and B sessions
3. Complete task: "Add DEBUG level logging and implement structured JSON logging"
   - Must use file-based approach (Y)
   - Must not revert to console logging (X)
   - Should use correct logger initialization from config

## Determinism Guarantees

All fixtures are generated with:
- Hardcoded versions (no `^` or `~` semver)
- Deterministic file timestamps
- Fixed random seeds for generated content
- No external API calls during fixture generation

## Adding New Fixtures

To add a fixture:

1. Create directory: `fixtures/project-{name}/`
2. Create fixture generator in Python (see `generate-fixture.py`)
3. Document in FIXTURES.md
4. Run generator: `python3 generate-fixture.py project-{name}`
5. Commit generated files
6. Update `runner/config.ts` to reference new fixture

All fixtures must be binary-identical across runs (no randomness after initial generation).
