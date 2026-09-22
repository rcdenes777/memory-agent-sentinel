import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Maybe } from '../scoring/gates';

export interface StaticVerificationResult {
  ran: boolean;
  typecheckPassed: Maybe<boolean>;
  logsToConsoleAsPrimarySink: Maybe<boolean>;
  hasDebugLevelSupport: Maybe<boolean>;
  hasJsonStructuredLogging: Maybe<boolean>;
  testsPassed: Maybe<boolean>;
  log: string[];
}

function safeReadFile(p: string): string | null {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null;
}

/**
 * Independent, deterministic verification of SESSION_C's coding task,
 * separate from the agent's own self-report. Every field defaults to
 * 'MISSING' (fail-closed) if the corresponding check could not actually run
 * — it is never assumed to have passed.
 */
export function verifyCodingTask(workDir: string): StaticVerificationResult {
  const log: string[] = [];
  const loggerPath = path.join(workDir, 'src', 'middleware', 'logger.ts');
  const loggerSource = safeReadFile(loggerPath);

  let logsToConsoleAsPrimarySink: Maybe<boolean> = 'MISSING';
  let hasDebugLevelSupport: Maybe<boolean> = 'MISSING';
  let hasJsonStructuredLogging: Maybe<boolean> = 'MISSING';

  if (loggerSource !== null) {
    const activeConsoleLogLines = loggerSource
      .split('\n')
      .filter((line) => /console\.(log|info|warn|error)\s*\(/.test(line) && !/^\s*\/\//.test(line));
    logsToConsoleAsPrimarySink = activeConsoleLogLines.length > 0;
    hasDebugLevelSupport = /\bDEBUG\b/i.test(loggerSource);
    hasJsonStructuredLogging = /JSON\.stringify/.test(loggerSource);
  } else {
    log.push(`logger.ts not found at ${loggerPath}`);
  }

  let typecheckPassed: Maybe<boolean> = 'MISSING';
  let testsPassed: Maybe<boolean> = 'MISSING';
  let ran = false;

  try {
    log.push('npm install --no-audit --no-fund');
    execFileSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: workDir, stdio: 'pipe', timeout: 5 * 60 * 1000 });
    ran = true;
  } catch (err: any) {
    log.push(`npm install failed: ${err?.message ?? err}`);
  }

  if (ran) {
    try {
      execFileSync('npx', ['tsc', '--noEmit'], { cwd: workDir, stdio: 'pipe', timeout: 2 * 60 * 1000 });
      typecheckPassed = true;
    } catch (err: any) {
      typecheckPassed = false;
      log.push(`tsc --noEmit failed: ${err?.stdout?.toString?.() ?? err?.message ?? err}`);
    }

    try {
      execFileSync('npx', ['jest', '--silent'], { cwd: workDir, stdio: 'pipe', timeout: 2 * 60 * 1000 });
      testsPassed = true;
    } catch (err: any) {
      testsPassed = false;
      log.push(`jest failed: ${err?.stdout?.toString?.() ?? err?.message ?? err}`);
    }
  }

  return { ran, typecheckPassed, logsToConsoleAsPrimarySink, hasDebugLevelSupport, hasJsonStructuredLogging, testsPassed, log };
}
