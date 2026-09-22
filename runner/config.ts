export interface BenchmarkConfig {
  fixture: string;
  fixtureDir: string;
  isolationFixtureDir: string;
  sessionTimeoutSeconds: number;
  model: string;
  candidates: string[];
  minFactsRequired: number;
}

export const defaultConfig: BenchmarkConfig = {
  fixture: 'project-sample',
  fixtureDir: './fixtures/project-sample',
  isolationFixtureDir: './fixtures/project-isolation-b',
  sessionTimeoutSeconds: 600,
  model: 'sonnet',
  candidates: ['no-memory', 'ai-memory'],
  minFactsRequired: 3,
};

export function getConfig(overrides?: Partial<BenchmarkConfig>): BenchmarkConfig {
  return { ...defaultConfig, ...overrides };
}
