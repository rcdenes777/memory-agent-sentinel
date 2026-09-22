import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';

/**
 * Deterministic, harness-controlled fixture evolution.
 *
 * The starting file tree for SESSION_A/B/C is always identical across every
 * candidate and every run (given the same benchmark commit), independent of
 * what any agent actually wrote in a prior session. This directly satisfies
 * "baseline and memory candidates must use identical ... fixture snapshots":
 * a git diff of two different candidates' working directories at the start
 * of any given session must be empty.
 *
 * Mechanism: copy `base/`, then overlay `overlay-session-b/` (before
 * SESSION_B) or `overlay-session-c/` (before SESSION_C) on top, then commit.
 * Each session's own edits are committed afterward for audit (git show/git
 * diff), matching prompts/PROMPTS.md's documented verification rules, but
 * are never carried into the next session's starting tree.
 */

function copyRecursive(src: string, dest: string): void {
  fs.cpSync(src, dest, { recursive: true });
}

function git(cwd: string, args: string[]): void {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

export interface FixturePreparation {
  workDir: string;
}

/**
 * Initializes (or resets) `workDir` as a fresh git repo containing exactly
 * `fixtureBaseDir`'s content, and commits it. Call once per (run, fixture).
 */
export function initFixtureWorkDir(fixtureBaseDir: string, workDir: string): FixturePreparation {
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });
  copyRecursive(fixtureBaseDir, workDir);
  git(workDir, ['init', '-q']);
  git(workDir, ['config', 'user.email', 'sentinel@example.invalid']);
  git(workDir, ['config', 'user.name', 'Memory Sentinel Harness']);
  git(workDir, ['add', '-A']);
  git(workDir, ['commit', '-q', '-m', 'session-a-start (deterministic base fixture)']);
  return { workDir };
}

/** Deterministically evolve `workDir` to the SESSION_B starting state and commit it. */
export function applySessionBEvolution(overlayDir: string, workDir: string): void {
  copyRecursive(overlayDir, workDir);
  git(workDir, ['add', '-A']);
  git(workDir, ['commit', '-q', '-m', 'session-b-start (deterministic harness evolution)']);
}

/** Deterministically evolve `workDir` to the SESSION_C starting state and commit it. */
export function applySessionCEvolution(overlayDir: string, workDir: string): void {
  copyRecursive(overlayDir, workDir);
  git(workDir, ['add', '-A']);
  git(workDir, ['commit', '-q', '-m', 'session-c-start (deterministic harness evolution)']);
}

/** Commit whatever the agent left behind, for audit via `git show`/`git diff`. */
export function commitAgentWork(workDir: string, sessionLabel: string): void {
  git(workDir, ['add', '-A']);
  try {
    execFileSync('git', ['commit', '-q', '-m', `${sessionLabel}-agent-output`], { cwd: workDir, stdio: 'ignore' });
  } catch {
    // Nothing to commit (agent made no file changes) — not an error.
  }
}

export function readFile(workDir: string, relPath: string): string | null {
  const p = path.join(workDir, relPath);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null;
}
