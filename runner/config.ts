export interface BenchmarkConfig {
  fixture: string;
  fixturePath: string;
  sessionTimeoutSeconds: number;
  maxTokensPerSession: number;
  candidates: string[];
}

export const defaultConfig: BenchmarkConfig = {
  fixture: 'project-sample',
  fixturePath: './fixtures/project-sample',
  sessionTimeoutSeconds: 600, // 10 minutes
  maxTokensPerSession: 100000,
  candidates: ['no-memory', 'ai-memory'],
};

export function getConfig(overrides?: Partial<BenchmarkConfig>): BenchmarkConfig {
  return { ...defaultConfig, ...overrides };
}
