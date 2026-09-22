import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';
import { resolveAdapter } from './adapters/index';
import type { SessionInvocationResult } from './adapters/types';
import { initFixtureWorkDir, applySessionBEvolution, applySessionCEvolution, commitAgentWork } from './fixture-evolution';
import { verifyCodingTask } from './verify-coding-task';
import { extractIntTag, extractIntOrUnknownTag, extractStringTag, extractYesNoTag, scanForForbiddenTerms } from './grading';
import { GateEvaluator, type GateInputs } from '../scoring/gates';
import { aggregateMetrics } from '../scoring/metrics';
import { getBenchmarkCommitSha, getFixtureSha256 } from './provenance';
import type { BenchmarkConfig } from './config';
import type { SentinelResult, SessionLogEntry } from '../scoring/schema';

const REPO_ROOT = process.cwd();

function readPrompt(name: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, 'prompts', name), 'utf-8');
}

function readAnswerKey(fixtureDir: string): any {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, fixtureDir, 'ANSWER_KEY.json'), 'utf-8'));
}

function toSessionLog(label: string, r: SessionInvocationResult): SessionLogEntry {
  return {
    session_label: label,
    session_id: r.sessionId,
    is_error: r.isError,
    started_at: r.startedAtIso,
    ended_at: r.endedAtIso,
    memory_leak_suspected: r.memoryLeakSuspected,
  };
}

export interface RunOptions {
  candidate: string;
  config: BenchmarkConfig;
  runRootDir?: string;
}

export async function runFullBenchmark(opts: RunOptions): Promise<SentinelResult> {
  const runId = randomUUID();
  const runRootDir = opts.runRootDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'memory-sentinel-'));
  fs.mkdirSync(runRootDir, { recursive: true });

  const uniqueSuffix = runId.slice(0, 8);
  const sampleWorkDir = path.join(runRootDir, `${opts.candidate}-${uniqueSuffix}-project-sample`);
  const isolationWorkDir = path.join(runRootDir, `${opts.candidate}-${uniqueSuffix}-project-isolation-b`);
  const aiMemoryDataDir = path.join(runRootDir, 'ai-memory-data');

  const adapter = resolveAdapter(opts.candidate, { aiMemoryDataDir });
  const answerKeyIsolation = readAnswerKey(opts.config.isolationFixtureDir);

  const baseSampleDir = path.join(REPO_ROOT, opts.config.fixtureDir, 'base');
  const overlayBDir = path.join(REPO_ROOT, opts.config.fixtureDir, 'overlay-session-b');
  const overlayCDir = path.join(REPO_ROOT, opts.config.fixtureDir, 'overlay-session-c');
  const baseIsolationDir = path.join(REPO_ROOT, opts.config.isolationFixtureDir, 'base');

  // --- SESSION_A ---
  initFixtureWorkDir(baseSampleDir, sampleWorkDir);
  const resultA = await adapter.runSession({
    cwd: sampleWorkDir,
    prompt: readPrompt('session-a.txt'),
    sessionLabel: 'SESSION_A',
    model: opts.config.model,
    timeoutSeconds: opts.config.sessionTimeoutSeconds,
  });
  commitAgentWork(sampleWorkDir, 'session-a');

  // --- SESSION_B ---
  applySessionBEvolution(overlayBDir, sampleWorkDir);
  const resultB = await adapter.runSession({
    cwd: sampleWorkDir,
    prompt: readPrompt('session-b.txt'),
    sessionLabel: 'SESSION_B',
    model: opts.config.model,
    timeoutSeconds: opts.config.sessionTimeoutSeconds,
  });
  commitAgentWork(sampleWorkDir, 'session-b');

  // --- SESSION_C ---
  applySessionCEvolution(overlayCDir, sampleWorkDir);
  const resultC = await adapter.runSession({
    cwd: sampleWorkDir,
    prompt: readPrompt('session-c.txt'),
    sessionLabel: 'SESSION_C',
    model: opts.config.model,
    timeoutSeconds: opts.config.sessionTimeoutSeconds,
  });
  commitAgentWork(sampleWorkDir, 'session-c');

  const staticVerificationRaw = verifyCodingTask(sampleWorkDir);

  // --- ISOLATION PROBE (fixture B, same candidate/memory store) ---
  initFixtureWorkDir(baseIsolationDir, isolationWorkDir);
  const resultProbe = await adapter.runSession({
    cwd: isolationWorkDir,
    prompt: readPrompt('isolation-probe.txt'),
    sessionLabel: 'ISOLATION_PROBE',
    model: opts.config.model,
    timeoutSeconds: opts.config.sessionTimeoutSeconds,
  });
  commitAgentWork(isolationWorkDir, 'isolation-probe');

  // --- Grading ---
  const gateInputs: GateInputs = {
    sessionA: {
      ranSuccessfully: !resultA.isError,
      factsEstablished: extractIntTag(resultA.resultText, 'FACTS_ESTABLISHED'),
      decisionX: extractStringTag(resultA.resultText, 'DECISION_X'),
      minFactsRequired: opts.config.minFactsRequired,
    },
    sessionB: {
      ranSuccessfully: !resultB.isError,
      decisionY: extractStringTag(resultB.resultText, 'DECISION_Y'),
      staleConfirmedBySelfReport: extractYesNoTag(resultB.resultText, 'STALE_CONFIRMED'),
      rotationSizeMb: extractIntTag(resultB.resultText, 'ROTATION_SIZE_MB'),
    },
    sessionC: {
      ranSuccessfully: !resultC.isError,
      currentDecision: extractStringTag(resultC.resultText, 'CURRENT_DECISION'),
      originalProblemResolved: extractYesNoTag(resultC.resultText, 'ORIGINAL_PROBLEM_RESOLVED'),
      supersededAcknowledged: extractYesNoTag(resultC.resultText, 'SUPERSEDED_DECISION_ACKNOWLEDGED'),
      usedStaleApproachSelfReport: extractYesNoTag(resultC.resultText, 'USED_STALE_APPROACH'),
      rotationSizeMb: extractIntOrUnknownTag(resultC.resultText, 'ROTATION_SIZE_MB'),
      taskSuccessSelfReport: extractYesNoTag(resultC.resultText, 'TASK_SUCCESS'),
    },
    staticVerification: staticVerificationRaw,
    sessionIdsDistinct:
      resultA.sessionId === 'UNAVAILABLE' || resultB.sessionId === 'UNAVAILABLE' || resultC.sessionId === 'UNAVAILABLE'
        ? 'MISSING'
        : new Set([resultA.sessionId, resultB.sessionId, resultC.sessionId]).size === 3,
    isolationProbe: {
      ran: !resultProbe.isError,
      leakDetectedBySelfReport: extractYesNoTag(resultProbe.resultText, 'ISOLATION_PROBE_LEAK'),
      leakDetectedByKeywordScan: resultProbe.isError
        ? 'MISSING'
        : scanForForbiddenTerms(resultProbe.resultText, answerKeyIsolation.forbidden_terms_if_leaked_from_other_fixture).leaked,
    },
  };

  const gates = new GateEvaluator().evaluateAll(opts.candidate, gateInputs);
  const metrics = aggregateMetrics([resultA, resultB, resultC, resultProbe]);

  const result: SentinelResult = {
    run_id: runId,
    timestamp: new Date().toISOString(),
    benchmark_version: '1.0.0',
    candidate: opts.candidate as SentinelResult['candidate'],
    environment: {
      node_version: process.version,
      platform: `${os.platform()}-${os.arch()}`,
      agent_model: opts.config.model,
      memory_system_version: opts.candidate === 'ai-memory' ? (process.env.AI_MEMORY_VERSION ?? 'unknown') : null,
    },
    provenance: {
      benchmark_commit_sha: getBenchmarkCommitSha(REPO_ROOT),
      fixture_sha256: getFixtureSha256(path.join(REPO_ROOT, 'fixtures')),
    },
    gates,
    metrics: {
      FILES_READ: metrics.FILES_READ,
      GREP_CALLS: metrics.GREP_CALLS,
      MANUAL_INTERVENTIONS: 0,
      TOTAL_DURATION_SECONDS: metrics.TOTAL_DURATION_SECONDS,
      TOKEN_TELEMETRY: metrics.TOKEN_TELEMETRY,
    },
    session_logs: [
      toSessionLog('SESSION_A', resultA),
      toSessionLog('SESSION_B', resultB),
      toSessionLog('SESSION_C', resultC),
      toSessionLog('ISOLATION_PROBE', resultProbe),
    ],
    notes:
      resultA.memoryLeakSuspected || resultB.memoryLeakSuspected || resultC.memoryLeakSuspected || resultProbe.memoryLeakSuspected
        ? 'WARNING: at least one session reported a non-trivial lifecycle hook response (memory_leak_suspected=true). See runner/adapters/no-memory.ts for the known environmental limitation this measures.'
        : 'No non-trivial hook responses observed in any session.',
  };

  return result;
}
