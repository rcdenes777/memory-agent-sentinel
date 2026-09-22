import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GateEvaluation } from './gates';
import type { AggregatedTokenTelemetry } from './metrics';

export interface SessionLogEntry {
  session_label: string;
  session_id: string;
  is_error: boolean;
  started_at: string;
  ended_at: string;
  memory_leak_suspected: boolean;
}

export interface SentinelResult {
  run_id: string;
  timestamp: string;
  benchmark_version: '1.0.0';
  candidate: 'no-memory' | 'ai-memory' | 'other';
  environment: {
    node_version: string;
    typescript_version?: string;
    platform: string;
    agent_model: string;
    memory_system_version: string | null;
  };
  provenance: {
    benchmark_commit_sha: string;
    fixture_sha256: string;
  };
  gates: GateEvaluation;
  metrics: {
    FILES_READ: number;
    GREP_CALLS: number;
    MANUAL_INTERVENTIONS: 0;
    TOTAL_DURATION_SECONDS: number | 'UNAVAILABLE';
    TOKEN_TELEMETRY: AggregatedTokenTelemetry;
  };
  session_logs: SessionLogEntry[];
  notes?: string;
}

let cachedValidator: ValidateFunction | null = null;

function loadValidator(): ValidateFunction {
  if (cachedValidator) return cachedValidator;
  const schemaPath = path.join(process.cwd(), 'RESULT_SCHEMA.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  cachedValidator = ajv.compile(schema);
  return cachedValidator;
}

export interface ValidationOutcome {
  valid: boolean;
  errors: string[];
}

export function validateResult(result: unknown): ValidationOutcome {
  const validate = loadValidator();
  const valid = validate(result);
  if (valid) return { valid: true, errors: [] };
  const errors = (validate.errors ?? []).map((e) => `${e.instancePath || '(root)'} ${e.message}`);
  return { valid: false, errors };
}
