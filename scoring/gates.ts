// Fail-closed gate evaluation.
//
// Hard rule: a missing, unparsable, or not-yet-collected measurement must
// NEVER be treated as a passing signal. Every gate below only returns PASS
// when every measurement it depends on is explicitly present and correct.
// There is no `x !== false` or `x || default` pattern anywhere in this file
// — those are exactly the constructs that made the previous version of this
// file fail-open (a missing metric silently defaulted to a passing value).

export type Maybe<T> = T | 'MISSING';

export function present<T>(v: Maybe<T>): v is T {
  return v !== 'MISSING';
}

function isTrue(v: Maybe<boolean>): boolean {
  return present(v) && v === true;
}

function isFalse(v: Maybe<boolean>): boolean {
  return present(v) && v === false;
}

export interface GateInputs {
  sessionA: {
    ranSuccessfully: boolean;
    factsEstablished: Maybe<number>;
    decisionX: Maybe<string>;
    minFactsRequired: number;
  };
  sessionB: {
    ranSuccessfully: boolean;
    decisionY: Maybe<string>;
    staleConfirmedBySelfReport: Maybe<boolean>;
    rotationSizeMb: Maybe<number>;
  };
  sessionC: {
    ranSuccessfully: boolean;
    currentDecision: Maybe<string>;
    originalProblemResolved: Maybe<boolean>;
    supersededAcknowledged: Maybe<boolean>;
    usedStaleApproachSelfReport: Maybe<boolean>;
    rotationSizeMb: Maybe<number>;
    taskSuccessSelfReport: Maybe<boolean>;
  };
  staticVerification: {
    ran: boolean;
    typecheckPassed: Maybe<boolean>;
    logsToConsoleAsPrimarySink: Maybe<boolean>;
    hasDebugLevelSupport: Maybe<boolean>;
    hasJsonStructuredLogging: Maybe<boolean>;
    testsPassed: Maybe<boolean>;
  };
  sessionIdsDistinct: Maybe<boolean>;
  isolationProbe: {
    ran: boolean;
    leakDetectedBySelfReport: Maybe<boolean>;
    leakDetectedByKeywordScan: Maybe<boolean>;
  };
}

export interface GateResult {
  status: 'PASS' | 'FAIL' | 'INCOMPLETE';
  details: string;
  measurements: Record<string, number | string | boolean>;
}

export interface GateEvaluation {
  [key: string]: GateResult;
}

function fail(details: string, measurements: Record<string, number | string | boolean> = {}): GateResult {
  return { status: 'FAIL', details, measurements };
}

function incomplete(details: string, measurements: Record<string, number | string | boolean> = {}): GateResult {
  return { status: 'INCOMPLETE', details, measurements };
}

function pass(details: string, measurements: Record<string, number | string | boolean> = {}): GateResult {
  return { status: 'PASS', details, measurements };
}

export class GateEvaluator {
  evaluateS0(candidate: string): GateResult {
    // Structural marker, not a pass/fail measurement of the candidate: it
    // records which comparison point this run represents.
    return pass(`Run recorded as comparison point: ${candidate}`, { candidate });
  }

  evaluateS1SessionCapture(input: GateInputs['sessionA']): GateResult {
    if (!input.ranSuccessfully) {
      return incomplete('SESSION_A did not complete successfully; no capture data available.');
    }
    if (!present(input.factsEstablished) || !present(input.decisionX)) {
      return fail('SESSION_A output is missing required FACTS_ESTABLISHED and/or DECISION_X tags.', {
        factsEstablished: present(input.factsEstablished) ? input.factsEstablished : 'MISSING',
        decisionX: present(input.decisionX) ? input.decisionX : 'MISSING',
      });
    }
    if (input.decisionX.trim().length === 0) {
      return fail('DECISION_X tag was present but empty.');
    }
    const status = input.factsEstablished >= input.minFactsRequired;
    return {
      status: status ? 'PASS' : 'FAIL',
      details: `SESSION_A captured ${input.factsEstablished} facts (minimum required: ${input.minFactsRequired}).`,
      measurements: { factsEstablished: input.factsEstablished, minFactsRequired: input.minFactsRequired },
    };
  }

  evaluateS2CrossSessionRecall(sessionB: GateInputs['sessionB'], sessionC: GateInputs['sessionC']): GateResult {
    if (!present(sessionB.rotationSizeMb)) {
      return fail('SESSION_B never recorded a ROTATION_SIZE_MB value; there is no ground truth to recall.');
    }
    if (!present(sessionC.rotationSizeMb)) {
      return fail('SESSION_C did not recall a ROTATION_SIZE_MB value (missing or UNKNOWN).');
    }
    const match = sessionB.rotationSizeMb === sessionC.rotationSizeMb;
    return {
      status: match ? 'PASS' : 'FAIL',
      details: match
        ? `SESSION_C correctly recalled the rotation size decided in SESSION_B (${sessionB.rotationSizeMb} MB).`
        : `SESSION_C reported ${sessionC.rotationSizeMb} MB, but SESSION_B had decided ${sessionB.rotationSizeMb} MB.`,
      measurements: { decidedInSessionB: sessionB.rotationSizeMb, recalledInSessionC: sessionC.rotationSizeMb },
    };
  }

  evaluateS3StaleSuperSession(
    sessionB: GateInputs['sessionB'],
    sessionC: GateInputs['sessionC'],
    staticVerification: GateInputs['staticVerification']
  ): GateResult {
    const missing: string[] = [];
    if (!present(sessionB.staleConfirmedBySelfReport)) missing.push('SESSION_B STALE_CONFIRMED');
    if (!present(sessionC.usedStaleApproachSelfReport)) missing.push('SESSION_C USED_STALE_APPROACH');
    if (!present(staticVerification.logsToConsoleAsPrimarySink)) missing.push('static verification of logging sink');
    if (missing.length > 0) {
      return fail(`Cannot evaluate stale supersession: missing ${missing.join(', ')}.`);
    }
    const bConfirmedStale = isTrue(sessionB.staleConfirmedBySelfReport);
    const selfReportedNoStaleUse = isFalse(sessionC.usedStaleApproachSelfReport);
    const staticallyClean = isFalse(staticVerification.logsToConsoleAsPrimarySink);
    const status = bConfirmedStale && selfReportedNoStaleUse && staticallyClean;
    return {
      status: status ? 'PASS' : 'FAIL',
      details: `SESSION_B confirmed staleness: ${bConfirmedStale}; SESSION_C self-reported no stale use: ${selfReportedNoStaleUse}; static check confirms console logging is not the primary sink: ${staticallyClean}.`,
      measurements: { bConfirmedStale, selfReportedNoStaleUse, staticallyClean },
    };
  }

  evaluateS4MultiHopRecall(s2: GateResult, sessionC: GateInputs['sessionC']): GateResult {
    if (!present(sessionC.originalProblemResolved)) {
      return fail('SESSION_C did not report ORIGINAL_PROBLEM_RESOLVED.');
    }
    const hop1 = s2.status === 'PASS';
    const hop2 = isTrue(sessionC.originalProblemResolved);
    const status = hop1 && hop2;
    return {
      status: status ? 'PASS' : 'FAIL',
      details: `Multi-hop recall requires both hops to succeed: cross-session numeric recall (${hop1 ? 'ok' : 'failed'}) and acknowledgement that the SESSION_A problem was resolved (${hop2 ? 'yes' : 'no/missing'}).`,
      measurements: { hop1CrossSessionRecall: hop1, hop2OriginalProblemResolved: hop2 },
    };
  }

  evaluateS5ProvenanceBinding(sessionC: GateInputs['sessionC']): GateResult {
    if (!present(sessionC.supersededAcknowledged) || !present(sessionC.currentDecision)) {
      return fail('SESSION_C is missing SUPERSEDED_DECISION_ACKNOWLEDGED and/or CURRENT_DECISION.');
    }
    const status = isTrue(sessionC.supersededAcknowledged) && sessionC.currentDecision.trim().length > 0;
    return {
      status: status ? 'PASS' : 'FAIL',
      details: `SESSION_C acknowledged the decision supersession chain: ${isTrue(sessionC.supersededAcknowledged)}.`,
      measurements: { supersededAcknowledged: isTrue(sessionC.supersededAcknowledged) },
    };
  }

  evaluateS6ProjectIsolation(probe: GateInputs['isolationProbe']): GateResult {
    if (!probe.ran) {
      return incomplete('Isolation probe session did not run.');
    }
    if (!present(probe.leakDetectedBySelfReport) || !present(probe.leakDetectedByKeywordScan)) {
      return fail('Isolation probe ran but leak-detection measurements are missing.');
    }
    const selfReportClean = isFalse(probe.leakDetectedBySelfReport);
    const keywordScanClean = isFalse(probe.leakDetectedByKeywordScan);
    const status = selfReportClean && keywordScanClean;
    return {
      status: status ? 'PASS' : 'FAIL',
      details: `Isolation probe self-report clean: ${selfReportClean}; independent keyword-leak scan clean: ${keywordScanClean}.`,
      measurements: { selfReportClean, keywordScanClean },
    };
  }

  evaluateS7RestartPersistence(sessionIdsDistinct: Maybe<boolean>, s2: GateResult): GateResult {
    if (!present(sessionIdsDistinct)) {
      return incomplete('Could not confirm session_id values from the CLI to prove independent process restarts.');
    }
    if (!sessionIdsDistinct) {
      return fail('SESSION_A/B/C did not run as independent processes (identical session_id detected) — restart was not real.');
    }
    const status = s2.status === 'PASS';
    return {
      status: status ? 'PASS' : 'FAIL',
      details: `Sessions ran as confirmed-independent processes (distinct session_id per session). Persistence is evidenced by ${status ? 'successful' : 'failed'} cross-session recall (S2).`,
      measurements: { sessionIdsDistinct, recallSucceeded: status },
    };
  }

  evaluateS8ContextDependentTask(sessionC: GateInputs['sessionC'], staticVerification: GateInputs['staticVerification']): GateResult {
    if (!staticVerification.ran) {
      return incomplete('Static verification (typecheck/tests/log-format checks) did not run.');
    }
    const requiredFields: Array<[string, Maybe<boolean>]> = [
      ['SESSION_C TASK_SUCCESS self-report', sessionC.taskSuccessSelfReport],
      ['typecheck', staticVerification.typecheckPassed],
      ['DEBUG level support', staticVerification.hasDebugLevelSupport],
      ['structured JSON logging', staticVerification.hasJsonStructuredLogging],
      ['tests passed', staticVerification.testsPassed],
    ];
    const missing = requiredFields.filter(([, v]) => !present(v)).map(([name]) => name);
    if (missing.length > 0) {
      return fail(`Missing required verification signal(s): ${missing.join(', ')}.`);
    }
    const allTrue = requiredFields.every(([, v]) => isTrue(v));
    return {
      status: allTrue ? 'PASS' : 'FAIL',
      details: `Coding task gate requires self-report AND independent static verification to all agree. Result: ${JSON.stringify(
        Object.fromEntries(requiredFields.map(([name, v]) => [name, isTrue(v)]))
      )}`,
      measurements: Object.fromEntries(requiredFields.map(([name, v]) => [name, isTrue(v)])),
    };
  }

  evaluateAll(candidate: string, inputs: GateInputs): GateEvaluation {
    const s2 = this.evaluateS2CrossSessionRecall(inputs.sessionB, inputs.sessionC);
    return {
      S0_BASELINE_NO_MEMORY: this.evaluateS0(candidate),
      S1_SESSION_CAPTURE: this.evaluateS1SessionCapture(inputs.sessionA),
      S2_CROSS_SESSION_RECALL: s2,
      S3_STALE_SUPERSESSION: this.evaluateS3StaleSuperSession(inputs.sessionB, inputs.sessionC, inputs.staticVerification),
      S4_MULTI_HOP_RECALL: this.evaluateS4MultiHopRecall(s2, inputs.sessionC),
      S5_PROVENANCE_BINDING: this.evaluateS5ProvenanceBinding(inputs.sessionC),
      S6_PROJECT_ISOLATION: this.evaluateS6ProjectIsolation(inputs.isolationProbe),
      S7_RESTART_PERSISTENCE: this.evaluateS7RestartPersistence(inputs.sessionIdsDistinct, s2),
      S8_CONTEXT_DEPENDENT_CODING_TASK: this.evaluateS8ContextDependentTask(inputs.sessionC, inputs.staticVerification),
    };
  }
}
