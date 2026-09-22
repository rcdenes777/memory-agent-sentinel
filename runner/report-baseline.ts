#!/usr/bin/env node

// Produces a Markdown report (not HTML — see README.md for why: this
// benchmark deliberately does not compute a weighted score or visualization
// that could imply a subjective "winner").

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SentinelResult } from '../scoring/schema';

const RESULTS_DIR = path.join(process.cwd(), 'results');
const REPORTS_DIR = path.join(process.cwd(), 'reports');

function loadAll(): SentinelResult[] {
  if (!fs.existsSync(RESULTS_DIR)) return [];
  return fs
    .readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), 'utf-8')) as SentinelResult);
}

function main() {
  const results = loadAll();
  if (results.length === 0) {
    console.log('No results found in results/.');
    return;
  }

  const lines: string[] = ['# Memory Sentinel Baseline Report', '', `Generated: ${new Date().toISOString()}`, ''];
  for (const r of results.sort((a, b) => a.timestamp.localeCompare(b.timestamp))) {
    lines.push(`## ${r.candidate} — ${r.timestamp} (run ${r.run_id})`);
    lines.push('');
    lines.push(`- benchmark_commit_sha: \`${r.provenance.benchmark_commit_sha}\``);
    lines.push(`- fixture_sha256: \`${r.provenance.fixture_sha256}\``);
    lines.push(`- agent_model: \`${r.environment.agent_model}\``);
    lines.push('');
    lines.push('| Gate | Status | Details |');
    lines.push('|---|---|---|');
    for (const [gate, res] of Object.entries(r.gates)) {
      lines.push(`| ${gate} | ${res.status} | ${res.details.replace(/\|/g, '\\|')} |`);
    }
    lines.push('');
    if (r.notes) {
      lines.push(`> ${r.notes}`);
      lines.push('');
    }
  }

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const outPath = path.join(REPORTS_DIR, `baseline_${new Date().toISOString().replace(/[:.]/g, '-')}.md`);
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(`Report written to: ${path.relative(process.cwd(), outPath)}`);
}

main();
