#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SentinelResult } from '../scoring/schema';

const RESULTS_DIR = path.join(process.cwd(), 'results');

function loadAll(): SentinelResult[] {
  if (!fs.existsSync(RESULTS_DIR)) return [];
  return fs
    .readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), 'utf-8')) as SentinelResult);
}

function latestFor(results: SentinelResult[], candidate: string): SentinelResult | undefined {
  return results.filter((r) => r.candidate === candidate).sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
}

function main() {
  const explicit = process.argv.slice(2).filter((a) => a.endsWith('.json'));
  const all = loadAll();

  let a: SentinelResult | undefined;
  let b: SentinelResult | undefined;
  if (explicit.length === 2) {
    a = JSON.parse(fs.readFileSync(explicit[0], 'utf-8'));
    b = JSON.parse(fs.readFileSync(explicit[1], 'utf-8'));
  } else {
    a = latestFor(all, 'no-memory');
    b = latestFor(all, 'ai-memory');
  }

  if (!a || !b) {
    console.log('Need one no-memory and one ai-memory result to compare (or pass two result file paths explicitly).');
    return;
  }

  console.log(`Comparing ${a.candidate} (${a.run_id}) vs ${b.candidate} (${b.run_id})`);
  console.log('');
  const gateNames = Object.keys(a.gates);
  for (const gate of gateNames) {
    const ga = a.gates[gate]?.status ?? 'MISSING';
    const gb = b.gates[gate]?.status ?? 'MISSING';
    const marker = ga === gb ? '=' : ga === 'PASS' ? '▼' : gb === 'PASS' ? '▲' : '≠';
    console.log(`  ${marker}  ${gate.padEnd(35)} ${a.candidate}=${ga.padEnd(10)} ${b.candidate}=${gb}`);
  }
  console.log('');
  console.log('No weighted overall score is computed — compare gate-by-gate and by raw metric, per SENTINEL_MEMORY_V1.md.');
}

main();
