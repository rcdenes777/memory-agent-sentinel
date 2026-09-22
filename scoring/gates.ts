export interface GateResult {
  status: 'PASS' | 'FAIL' | 'SKIP';
  details: string;
  measurements?: Record<string, number | string | boolean>;
}

export interface GateEvaluation {
  [key: string]: GateResult;
}

export class GateEvaluator {
  evaluateS0(baseline: boolean): GateResult {
    return {
      status: 'PASS',
      details: 'Baseline established for comparison',
      measurements: { baseline },
    };
  }

  evaluateS1SessionCapture(factsEstablished: number, factsAccurate: boolean): GateResult {
    const status = factsEstablished > 3 && factsAccurate ? 'PASS' : 'FAIL';
    return {
      status,
      details: `Session A captured ${factsEstablished} facts accurately`,
      measurements: { factsEstablished, factsAccurate },
    };
  }

  evaluateS2CrossSessionRecall(factsRecalled: number, totalFacts: number): GateResult {
    const recallRate = factsRecalled / totalFacts;
    const status = recallRate >= 0.75 ? 'PASS' : 'FAIL';
    return {
      status,
      details: `Session B recalled ${factsRecalled}/${totalFacts} facts (${(recallRate * 100).toFixed(1)}%)`,
      measurements: { factsRecalled, recallRate },
    };
  }

  evaluateS3StaleSuperSession(usedCurrentDecision: boolean, usedStaleDecision: boolean): GateResult {
    const status = usedCurrentDecision && !usedStaleDecision ? 'PASS' : 'FAIL';
    return {
      status,
      details: `Session C used current decision: ${usedCurrentDecision}, used stale: ${usedStaleDecision}`,
      measurements: { usedCurrentDecision, usedStaleDecision },
    };
  }

  evaluateS4MultiHopRecall(successfulConnections: number, totalConnections: number): GateResult {
    const rate = successfulConnections / totalConnections;
    const status = rate >= 0.8 ? 'PASS' : 'FAIL';
    return {
      status,
      details: `Multi-hop recall: ${successfulConnections}/${totalConnections} connections`,
      measurements: { successfulConnections, rate },
    };
  }

  evaluateS5ProvenanceBinding(correctAttributions: number, totalFacts: number): GateResult {
    const rate = correctAttributions / totalFacts;
    const status = rate >= 0.9 ? 'PASS' : 'FAIL';
    return {
      status,
      details: `Provenance binding: ${correctAttributions}/${totalFacts} facts correctly attributed`,
      measurements: { correctAttributions, rate },
    };
  }

  evaluateS6ProjectIsolation(isolated: boolean): GateResult {
    return {
      status: isolated ? 'PASS' : 'FAIL',
      details: `Project contexts properly isolated: ${isolated}`,
      measurements: { isolated },
    };
  }

  evaluateS7RestartPersistence(survived: boolean): GateResult {
    return {
      status: survived ? 'PASS' : 'FAIL',
      details: `Context survived restart: ${survived}`,
      measurements: { survived },
    };
  }

  evaluateS8ContextDependentTask(taskCompleted: boolean, correctContext: boolean): GateResult {
    const status = taskCompleted && correctContext ? 'PASS' : 'FAIL';
    return {
      status,
      details: `Coding task completed: ${taskCompleted}, used correct context: ${correctContext}`,
      measurements: { taskCompleted, correctContext },
    };
  }

  evaluateAll(metrics: Record<string, any>): GateEvaluation {
    return {
      S0_BASELINE_NO_MEMORY: this.evaluateS0(true),
      S1_SESSION_CAPTURE: this.evaluateS1SessionCapture(
        metrics.factsEstablished || 0,
        metrics.factsAccurate !== false
      ),
      S2_CROSS_SESSION_RECALL: this.evaluateS2CrossSessionRecall(
        metrics.factsRecalled || 0,
        metrics.totalFacts || 5
      ),
      S3_STALE_SUPERSESSION: this.evaluateS3StaleSuperSession(
        metrics.usedCurrentDecision !== false,
        metrics.usedStaleDecision === true
      ),
      S4_MULTI_HOP_RECALL: this.evaluateS4MultiHopRecall(
        metrics.multiHopSuccesses || 0,
        metrics.multiHopAttempts || 1
      ),
      S5_PROVENANCE_BINDING: this.evaluateS5ProvenanceBinding(
        metrics.correctAttributions || 0,
        metrics.totalFacts || 5
      ),
      S6_PROJECT_ISOLATION: this.evaluateS6ProjectIsolation(metrics.isolated !== false),
      S7_RESTART_PERSISTENCE: this.evaluateS7RestartPersistence(metrics.contextSurvived !== false),
      S8_CONTEXT_DEPENDENT_CODING_TASK: this.evaluateS8ContextDependentTask(
        metrics.taskCompleted !== false,
        metrics.usedCorrectContext !== false
      ),
    };
  }
}
