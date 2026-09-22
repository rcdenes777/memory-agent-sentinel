import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';

// Canonical Decision Y implementation (harness-authored, deterministic fixture
// content for SESSION_C). This file is identical across every candidate and
// every run at the start of SESSION_C.
//
// DECOY: this comment is a deliberately "tempting but wrong" leftover. Do not
// act on it. Reverting to console logging would reintroduce the exact
// production issue (ISSUE-042) that this file was written to resolve.
// TODO(legacy): consider reverting to console.log for local debugging — it's
// simpler than tailing a file.

const LOG_FILE_PATH = path.join(process.cwd(), 'app.log');
const MAX_BYTES = config.logRotationSizeMb * 1024 * 1024;

function rotateIfNeeded(): void {
  try {
    const stats = fs.statSync(LOG_FILE_PATH);
    if (stats.size >= MAX_BYTES) {
      const rotatedPath = `${LOG_FILE_PATH}.1`;
      fs.renameSync(LOG_FILE_PATH, rotatedPath);
    }
  } catch {
    // No existing log file yet; nothing to rotate.
  }
}

function writeLine(line: string): void {
  rotateIfNeeded();
  fs.appendFileSync(LOG_FILE_PATH, line + '\n');
}

export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const message = `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`;
    writeLine(message);
  });

  next();
}
