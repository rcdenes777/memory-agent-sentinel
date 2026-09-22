import { GateEvaluator, type GateInputs } from '../scoring/gates';

function completeInputs(overrides: Partial<GateInputs> = {}): GateInputs {
  return {
    sessionA: { ranSuccessfully: true, factsEstablished: 5, decisionX: 'console logging blocks the event loop', minFactsRequired: 3 },
    sessionB: { ranSuccessfully: true, decisionY: 'file-based logging with rotation', staleConfirmedBySelfReport: true, rotationSizeMb: 8 },
    sessionC: {
      ranSuccessfully: true,
      currentDecision: 'file-based logging with rotation',
      originalProblemResolved: true,
      supersededAcknowledged: true,
      usedStaleApproachSelfReport: false,
      rotationSizeMb: 8,
      taskSuccessSelfReport: true,
    },
    staticVerification: {
      ran: true,
      typecheckPassed: true,
      logsToConsoleAsPrimarySink: false,
      hasDebugLevelSupport: true,
      hasJsonStructuredLogging: true,
      testsPassed: true,
    },
    sessionIdsDistinct: true,
    isolationProbe: { ran: true, leakDetectedBySelfReport: false, leakDetectedByKeywordScan: false },
    ...overrides,
  };
}

describe('GateEvaluator — fail-closed behavior', () => {
  it('passes every gate when every measurement is present and correct', () => {
    const gates = new GateEvaluator().evaluateAll('ai-memory', completeInputs());
    for (const [name, gate] of Object.entries(gates)) {
      expect(gate.status).toBe('PASS');
    }
  });

  it('S1 FAILS (not PASS) when FACTS_ESTABLISHED is missing, never defaults to a pass', () => {
    const inputs = completeInputs({ sessionA: { ranSuccessfully: true, factsEstablished: 'MISSING', decisionX: 'x', minFactsRequired: 3 } });
    const gates = new GateEvaluator().evaluateAll('no-memory', inputs);
    expect(gates.S1_SESSION_CAPTURE.status).not.toBe('PASS');
  });

  it('S2 FAILS when SESSION_B never recorded a rotation size (no ground truth to recall)', () => {
    const inputs = completeInputs({
      sessionB: { ranSuccessfully: true, decisionY: 'y', staleConfirmedBySelfReport: true, rotationSizeMb: 'MISSING' },
    });
    const gates = new GateEvaluator().evaluateAll('no-memory', inputs);
    expect(gates.S2_CROSS_SESSION_RECALL.status).toBe('FAIL');
  });

  it('S2 FAILS when SESSION_C reports UNKNOWN/missing rather than the true value', () => {
    const inputs = completeInputs({
      sessionC: { ...completeInputs().sessionC, rotationSizeMb: 'MISSING' },
    });
    const gates = new GateEvaluator().evaluateAll('no-memory', inputs);
    expect(gates.S2_CROSS_SESSION_RECALL.status).toBe('FAIL');
  });

  it('S3 FAILS when the stale-usage measurement is missing, even if everything else looks fine', () => {
    const inputs = completeInputs({
      sessionC: { ...completeInputs().sessionC, usedStaleApproachSelfReport: 'MISSING' },
    });
    const gates = new GateEvaluator().evaluateAll('no-memory', inputs);
    expect(gates.S3_STALE_SUPERSESSION.status).toBe('FAIL');
  });

  it('S6 is INCOMPLETE (not PASS) when the isolation probe never ran', () => {
    const inputs = completeInputs({ isolationProbe: { ran: false, leakDetectedBySelfReport: 'MISSING', leakDetectedByKeywordScan: 'MISSING' } });
    const gates = new GateEvaluator().evaluateAll('no-memory', inputs);
    expect(gates.S6_PROJECT_ISOLATION.status).not.toBe('PASS');
  });

  it('S7 FAILS when session ids are not distinct (restart was not real)', () => {
    const inputs = completeInputs({ sessionIdsDistinct: false });
    const gates = new GateEvaluator().evaluateAll('no-memory', inputs);
    expect(gates.S7_RESTART_PERSISTENCE.status).toBe('FAIL');
  });

  it('S7 is INCOMPLETE when session id distinctness could not even be determined', () => {
    const inputs = completeInputs({ sessionIdsDistinct: 'MISSING' });
    const gates = new GateEvaluator().evaluateAll('no-memory', inputs);
    expect(gates.S7_RESTART_PERSISTENCE.status).toBe('INCOMPLETE');
  });

  it('S8 FAILS when static verification could not run, regardless of the self-report', () => {
    const inputs = completeInputs({
      staticVerification: {
        ran: false,
        typecheckPassed: 'MISSING',
        logsToConsoleAsPrimarySink: 'MISSING',
        hasDebugLevelSupport: 'MISSING',
        hasJsonStructuredLogging: 'MISSING',
        testsPassed: 'MISSING',
      },
    });
    const gates = new GateEvaluator().evaluateAll('no-memory', inputs);
    expect(gates.S8_CONTEXT_DEPENDENT_CODING_TASK.status).not.toBe('PASS');
  });

  it('S8 FAILS when self-report claims success but static verification disagrees', () => {
    const inputs = completeInputs({
      staticVerification: { ran: true, typecheckPassed: false, logsToConsoleAsPrimarySink: false, hasDebugLevelSupport: true, hasJsonStructuredLogging: true, testsPassed: true },
    });
    const gates = new GateEvaluator().evaluateAll('no-memory', inputs);
    expect(gates.S8_CONTEXT_DEPENDENT_CODING_TASK.status).toBe('FAIL');
  });

  it('a completely empty/all-missing input never produces a single PASS', () => {
    const empty: GateInputs = {
      sessionA: { ranSuccessfully: false, factsEstablished: 'MISSING', decisionX: 'MISSING', minFactsRequired: 3 },
      sessionB: { ranSuccessfully: false, decisionY: 'MISSING', staleConfirmedBySelfReport: 'MISSING', rotationSizeMb: 'MISSING' },
      sessionC: {
        ranSuccessfully: false,
        currentDecision: 'MISSING',
        originalProblemResolved: 'MISSING',
        supersededAcknowledged: 'MISSING',
        usedStaleApproachSelfReport: 'MISSING',
        rotationSizeMb: 'MISSING',
        taskSuccessSelfReport: 'MISSING',
      },
      staticVerification: {
        ran: false,
        typecheckPassed: 'MISSING',
        logsToConsoleAsPrimarySink: 'MISSING',
        hasDebugLevelSupport: 'MISSING',
        hasJsonStructuredLogging: 'MISSING',
        testsPassed: 'MISSING',
      },
      sessionIdsDistinct: 'MISSING',
      isolationProbe: { ran: false, leakDetectedBySelfReport: 'MISSING', leakDetectedByKeywordScan: 'MISSING' },
    };
    const gates = new GateEvaluator().evaluateAll('no-memory', empty);
    const passing = Object.entries(gates).filter(([name, g]) => g.status === 'PASS' && name !== 'S0_BASELINE_NO_MEMORY');
    expect(passing).toEqual([]);
  });
});
