import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export function getBenchmarkCommitSha(repoRoot: string): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot }).toString().trim();
}

function listFilesSorted(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesSorted(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out.sort();
}

/** SHA-256 over every file under `fixturesDir`, in sorted path order, binding a result to the exact fixture content used. */
export function getFixtureSha256(fixturesDir: string): string {
  const hash = crypto.createHash('sha256');
  for (const file of listFilesSorted(fixturesDir)) {
    hash.update(path.relative(fixturesDir, file));
    hash.update(fs.readFileSync(file));
  }
  return hash.digest('hex');
}
