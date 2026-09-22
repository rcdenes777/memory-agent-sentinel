#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { getConfig } from './config';
import { runFullBenchmark } from './session-runner';
import { validateResult } from '../scoring/schema';

async function main() {
  const args = process.argv.slice(2);
  const candidateArg = args.find((arg) => arg.startsWith('--candidate'))?.split('=')[1];
  const candidate = candidateArg || 'no-memory';
  const modelArg = args.find((arg) => arg.startsWith('--model'))?.split('=')[1];

  console.log(`Memory Sentinel V1 - Candidate: ${candidate}`);
  console.log('─'.repeat(50));

  const config = getConfig(modelArg ? { model: modelArg } : undefined);
  console.log(`Fixture: ${config.fixture}`);
  console.log(`Model: ${config.model}`);
  console.log(`Timeout: ${config.sessionTimeoutSeconds}s`);
  console.log('');

  const result = await runFullBenchmark({ candidate, config });

  const validation = validateResult(result);
  if (!validation.valid) {
    console.error('FATAL: produced result does not validate against RESULT_SCHEMA.json:');
    for (const err of validation.errors) console.error(`  - ${err}`);
    console.error('Refusing to write an unvalidated result file.');
    process.exit(1);
  }

  const resultsDir = path.join(process.cwd(), 'results');
  fs.mkdirSync(resultsDir, { recursive: true });
  const filename = `${candidate}_${result.timestamp.replace(/[:.]/g, '-')}.json`;
  const outPath = path.join(resultsDir, filename);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

  console.log(`Result written to: ${path.relative(process.cwd(), outPath)}`);
  console.log('');
  console.log('Gates:');
  for (const [gate, res] of Object.entries(result.gates)) {
    console.log(`  ${res.status.padEnd(10)} ${gate} — ${res.details}`);
  }
  console.log('');
  console.log(result.notes ?? '');

  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
