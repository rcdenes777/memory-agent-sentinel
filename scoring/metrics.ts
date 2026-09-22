export interface TokenTelemetry {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  total_cost_usd: number;
  num_turns: number;
  duration_ms: number;
  duration_api_ms: number;
}

export interface MetricsSnapshot {
  TASK_SUCCESS: boolean;
  CORRECT_RECALL: number;
  STALE_RECALL: number;
  FALSE_RECALL: number;
  PROVENANCE_CORRECT: number;
  MULTIHOP_SUCCESS: boolean;
  PROJECT_ISOLATION: boolean;
  RESTART_PERSISTENCE: boolean;
  TOKENS_INPUT: number;
  FILES_READ: number;
  GREP_CALLS: number;
  TIME_TO_USEFUL_CONTEXT_SECONDS: number;
  MANUAL_INTERVENTIONS: number;
  TOTAL_DURATION_SECONDS: number;
  TOKEN_TELEMETRY?: TokenTelemetry;
}

export class MetricsCollector {
  private metrics: Partial<MetricsSnapshot> = {};
  private startTime: number = Date.now();
  private sessionStartTime: number = Date.now();
  private tokenTelemetry: Partial<TokenTelemetry> = {};

  constructor() {
    this.reset();
  }

  reset(): void {
    this.metrics = {
      TASK_SUCCESS: false,
      CORRECT_RECALL: 0,
      STALE_RECALL: 0,
      FALSE_RECALL: 0,
      PROVENANCE_CORRECT: 0,
      MULTIHOP_SUCCESS: false,
      PROJECT_ISOLATION: true,
      RESTART_PERSISTENCE: true,
      TOKENS_INPUT: 0,
      FILES_READ: 0,
      GREP_CALLS: 0,
      TIME_TO_USEFUL_CONTEXT_SECONDS: 0,
      MANUAL_INTERVENTIONS: 0,
      TOTAL_DURATION_SECONDS: 0,
    };
    this.tokenTelemetry = {
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
      total_cost_usd: 0,
      num_turns: 0,
      duration_ms: 0,
      duration_api_ms: 0,
    };
    this.startTime = Date.now();
    this.sessionStartTime = Date.now();
  }

  recordTaskSuccess(success: boolean): void {
    this.metrics.TASK_SUCCESS = success;
  }

  recordCorrectRecall(count: number): void {
    this.metrics.CORRECT_RECALL = count;
  }

  recordStaleRecall(count: number): void {
    this.metrics.STALE_RECALL = count;
  }

  recordFalseRecall(count: number): void {
    this.metrics.FALSE_RECALL = count;
  }

  recordProvenanceCorrect(count: number): void {
    this.metrics.PROVENANCE_CORRECT = count;
  }

  recordMultihopSuccess(success: boolean): void {
    this.metrics.MULTIHOP_SUCCESS = success;
  }

  recordProjectIsolation(isolated: boolean): void {
    this.metrics.PROJECT_ISOLATION = isolated;
  }

  recordRestartPersistence(survived: boolean): void {
    this.metrics.RESTART_PERSISTENCE = survived;
  }

  recordTokensUsed(tokens: number): void {
    this.metrics.TOKENS_INPUT = (this.metrics.TOKENS_INPUT || 0) + tokens;
  }

  recordFileRead(): void {
    this.metrics.FILES_READ = (this.metrics.FILES_READ || 0) + 1;
  }

  recordGrepCall(): void {
    this.metrics.GREP_CALLS = (this.metrics.GREP_CALLS || 0) + 1;
  }

  recordTimeToUsefulContext(seconds: number): void {
    this.metrics.TIME_TO_USEFUL_CONTEXT_SECONDS = seconds;
  }

  recordManualIntervention(): void {
    this.metrics.MANUAL_INTERVENTIONS = (this.metrics.MANUAL_INTERVENTIONS || 0) + 1;
  }

  recordSessionStart(): void {
    this.sessionStartTime = Date.now();
  }

  recordSessionEnd(): void {
    const duration = (Date.now() - this.sessionStartTime) / 1000;
    this.metrics.TOTAL_DURATION_SECONDS = (this.metrics.TOTAL_DURATION_SECONDS || 0) + duration;
  }

  recordTokenUsage(telemetry: Partial<TokenTelemetry>): void {
    this.tokenTelemetry.input_tokens = (this.tokenTelemetry.input_tokens || 0) + (telemetry.input_tokens || 0);
    this.tokenTelemetry.output_tokens = (this.tokenTelemetry.output_tokens || 0) + (telemetry.output_tokens || 0);
    this.tokenTelemetry.cache_read_input_tokens = (this.tokenTelemetry.cache_read_input_tokens || 0) + (telemetry.cache_read_input_tokens || 0);
    this.tokenTelemetry.cache_creation_input_tokens = (this.tokenTelemetry.cache_creation_input_tokens || 0) + (telemetry.cache_creation_input_tokens || 0);
    this.tokenTelemetry.total_cost_usd = (this.tokenTelemetry.total_cost_usd || 0) + (telemetry.total_cost_usd || 0);
    this.tokenTelemetry.num_turns = (this.tokenTelemetry.num_turns || 0) + (telemetry.num_turns || 0);
    this.tokenTelemetry.duration_ms = (this.tokenTelemetry.duration_ms || 0) + (telemetry.duration_ms || 0);
    this.tokenTelemetry.duration_api_ms = (this.tokenTelemetry.duration_api_ms || 0) + (telemetry.duration_api_ms || 0);
  }

  getMetrics(): MetricsSnapshot {
    const metrics: MetricsSnapshot = {
      TASK_SUCCESS: this.metrics.TASK_SUCCESS || false,
      CORRECT_RECALL: this.metrics.CORRECT_RECALL || 0,
      STALE_RECALL: this.metrics.STALE_RECALL || 0,
      FALSE_RECALL: this.metrics.FALSE_RECALL || 0,
      PROVENANCE_CORRECT: this.metrics.PROVENANCE_CORRECT || 0,
      MULTIHOP_SUCCESS: this.metrics.MULTIHOP_SUCCESS || false,
      PROJECT_ISOLATION: this.metrics.PROJECT_ISOLATION !== false,
      RESTART_PERSISTENCE: this.metrics.RESTART_PERSISTENCE !== false,
      TOKENS_INPUT: this.metrics.TOKENS_INPUT || 0,
      FILES_READ: this.metrics.FILES_READ || 0,
      GREP_CALLS: this.metrics.GREP_CALLS || 0,
      TIME_TO_USEFUL_CONTEXT_SECONDS: this.metrics.TIME_TO_USEFUL_CONTEXT_SECONDS || 0,
      MANUAL_INTERVENTIONS: this.metrics.MANUAL_INTERVENTIONS || 0,
      TOTAL_DURATION_SECONDS: this.metrics.TOTAL_DURATION_SECONDS || 0,
    };

    if (Object.values(this.tokenTelemetry).some(v => v && v > 0)) {
      metrics.TOKEN_TELEMETRY = {
        input_tokens: this.tokenTelemetry.input_tokens || 0,
        output_tokens: this.tokenTelemetry.output_tokens || 0,
        cache_read_input_tokens: this.tokenTelemetry.cache_read_input_tokens || 0,
        cache_creation_input_tokens: this.tokenTelemetry.cache_creation_input_tokens || 0,
        total_cost_usd: this.tokenTelemetry.total_cost_usd || 0,
        num_turns: this.tokenTelemetry.num_turns || 0,
        duration_ms: this.tokenTelemetry.duration_ms || 0,
        duration_api_ms: this.tokenTelemetry.duration_api_ms || 0,
      };
    }

    return metrics;
  }

  getRecallQuality(): number {
    const total = (this.metrics.CORRECT_RECALL || 0) + (this.metrics.STALE_RECALL || 0) + (this.metrics.FALSE_RECALL || 0);
    if (total === 0) return 0;
    return (this.metrics.CORRECT_RECALL || 0) / total;
  }
}
