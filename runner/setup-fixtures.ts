#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { initFixtureWorkDir, applySessionBEvolution, applySessionCEvolution } from './fixture-evolution';

const REPO_ROOT = process.cwd();

function checkFixture(fixtureDir: string, withEvolution: boolean): void {
  const base = path.join(REPO_ROOT, fixtureDir, 'base');
  const answerKey = path.join(REPO_ROOT, fixtureDir, 'ANSWER_KEY.json');
  if (!fs.existsSync(base)) throw new Error(`Missing ${base}`);
  if (!fs.existsSync(answerKey)) throw new Error(`Missing ${answerKey}`);
  JSON.parse(fs.readFileSync(answerKey, 'utf-8')); // throws on malformed JSON

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-fixture-check-'));
  try {
    initFixtureWorkDir(base, scratch);
    if (withEvolution) {
      const overlayB = path.join(REPO_ROOT, fixtureDir, 'overlay-session-b');
      const overlayC = path.join(REPO_ROOT, fixtureDir, 'overlay-session-c');
      if (!fs.existsSync(overlayB) || !fs.existsSync(overlayC)) {
        throw new Error(`${fixtureDir} is missing overlay-session-b/ or overlay-session-c/`);
      }
      applySessionBEvolution(overlayB, scratch);
      applySessionCEvolution(overlayC, scratch);
    }
    console.log(`OK: ${fixtureDir} (base${withEvolution ? ' + overlay-session-b + overlay-session-c' : ''} applies cleanly)`);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

function main() {
  checkFixture('fixtures/project-sample', true);
  checkFixture('fixtures/project-isolation-b', false);
  console.log('All fixtures validated.');
}

main();
