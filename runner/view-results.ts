#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SentinelResult } from '../scoring/schema';

const RESULTS_DIR = path.join(process.cwd(), 'results');

function loadResults(): SentinelResult[] {
  if (!fs.existsSync(RESULTS_DIR)) return [];
  return fs
    .readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), 'utf-8')) as SentinelResult)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function main() {
  const results = loadResults();
  if (results.length === 0) {
    console.log('No results found in results/. Run `npm run baseline:no-memory` first.');
    return;
  }
  for (const r of results) {
    const gateEntries = Object.entries(r.gates);
    const passCount = gateEntries.filter(([, g]) => g.status === 'PASS').length;
    console.log(`${r.timestamp}  ${r.candidate.padEnd(10)}  run=${r.run_id}  gates ${passCount}/${gateEntries.length} PASS`);
    for (const [gate, res] of gateEntries) {
      console.log(`    ${res.status.padEnd(10)} ${gate}`);
    }
  }
}

main();
