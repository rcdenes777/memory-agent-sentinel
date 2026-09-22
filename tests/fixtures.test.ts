import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { initFixtureWorkDir, applySessionBEvolution, applySessionCEvolution } from '../runner/fixture-evolution';
import { getConfig } from '../runner/config';

const REPO_ROOT = path.join(__dirname, '..');

describe('fixtures', () => {
  it('the second, independent isolation fixture exists and is registered in config', () => {
    const config = getConfig();
    expect(config.isolationFixtureDir).toBe('./fixtures/project-isolation-b');
    const base = path.join(REPO_ROOT, config.isolationFixtureDir, 'base');
    expect(fs.existsSync(base)).toBe(true);
    expect(fs.existsSync(path.join(REPO_ROOT, config.isolationFixtureDir, 'ANSWER_KEY.json'))).toBe(true);
  });

  it('the isolation fixture has confusable-but-distinct facts from project-sample', () => {
    const sampleKey = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'fixtures/project-sample/ANSWER_KEY.json'), 'utf-8'));
    const isolationKey = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'fixtures/project-isolation-b/ANSWER_KEY.json'), 'utf-8'));
    // Each fixture's own terms must be listed as forbidden-if-leaked in the other.
    for (const term of sampleKey.own_terms_that_must_not_leak_elsewhere) {
      expect(isolationKey.forbidden_terms_if_leaked_from_other_fixture).toContain(term);
    }
    for (const term of isolationKey.own_terms_that_must_not_leak_elsewhere) {
      expect(sampleKey.forbidden_terms_if_leaked_from_other_fixture).toContain(term);
    }
  });

  it('project-sample base + overlay-session-b + overlay-session-c apply cleanly and deterministically', () => {
    const scratch1 = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-test-fx-1-'));
    const scratch2 = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-test-fx-2-'));
    try {
      const base = path.join(REPO_ROOT, 'fixtures/project-sample/base');
      const overlayB = path.join(REPO_ROOT, 'fixtures/project-sample/overlay-session-b');
      const overlayC = path.join(REPO_ROOT, 'fixtures/project-sample/overlay-session-c');

      initFixtureWorkDir(base, scratch1);
      applySessionBEvolution(overlayB, scratch1);
      applySessionCEvolution(overlayC, scratch1);

      initFixtureWorkDir(base, scratch2);
      applySessionBEvolution(overlayB, scratch2);
      applySessionCEvolution(overlayC, scratch2);

      const listFiles = (dir: string): string[] => {
        const out: string[] = [];
        const walk = (d: string) => {
          for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
            if (entry.name === '.git') continue;
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.isFile()) out.push(full);
          }
        };
        walk(dir);
        return out;
      };

      const contentDigest = (dir: string) =>
        listFiles(dir)
          .sort()
          .map((f) => `${path.relative(dir, f)}:${fs.readFileSync(f, 'utf-8').length}`)
          .join('\n');

      expect(contentDigest(scratch1)).toEqual(contentDigest(scratch2));
    } finally {
      fs.rmSync(scratch1, { recursive: true, force: true });
      fs.rmSync(scratch2, { recursive: true, force: true });
    }
  });

  it('the SESSION_C decoy comment about reverting to console logging is present (stale-but-tempting trap)', () => {
    const loggerC = fs.readFileSync(
      path.join(REPO_ROOT, 'fixtures/project-sample/overlay-session-c/src/middleware/logger.ts'),
      'utf-8'
    );
    expect(loggerC.toLowerCase()).toMatch(/revert(ing)? to console/);
  });

  it('prompts no longer instruct the agent to ignore prior sessions', () => {
    for (const file of ['session-b.txt', 'session-c.txt']) {
      const text = fs.readFileSync(path.join(REPO_ROOT, 'prompts', file), 'utf-8');
      expect(text).not.toMatch(/do not reference prior sessions/i);
      expect(text).not.toMatch(/rely only on (code examination|examining the current code)/i);
    }
  });
});
