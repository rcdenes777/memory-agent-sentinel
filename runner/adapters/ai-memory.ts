import type { Adapter, RunSessionOptions, SessionInvocationResult } from './types';
import { runClaudeCli } from './claude-cli';

export interface AiMemoryAdapterConfig {
  /** Path to the ai-memory binary. Defaults to $AI_MEMORY_BIN, then a common install path. */
  binPath?: string;
  /** Isolated data directory for THIS benchmark run only — never the operator's personal store. */
  dataDir: string;
  /** Base URL of a running ai-memory hook server. Defaults to $AI_MEMORY_SERVER_URL. */
  serverUrl?: string;
}

function hookEntry(binPath: string, dataDir: string, serverUrl: string, event: string) {
  return {
    hooks: [
      {
        type: 'command',
        command: `${binPath} --data-dir ${dataDir} hook --event ${event} --agent claude-code --server-url ${serverUrl} --project-strategy repo-root`,
        timeout: 60,
      },
    ],
  };
}

/**
 * Baseline B: the existing ai-memory system.
 *
 * Wires ai-memory's lifecycle hooks (capture) AND its MCP server (active
 * retrieval via memory_query/memory_recent/memory_briefing) into an
 * isolated, run-specific data directory — never the operator's real
 * long-term memory store, so benchmark runs never pollute it and are
 * reproducible independent of what else the operator has stored.
 *
 * project-strategy=repo-root scopes memory by the basename of the git repo
 * root, so callers MUST run each session inside a real git repository whose
 * root basename stays stable across SESSION_A/B/C for the same run (for
 * cross-session recall) and is unique per fixture (for S6 isolation).
 */
export class AiMemoryAdapter implements Adapter {
  readonly name = 'ai-memory';
  private readonly binPath: string;
  private readonly dataDir: string;
  private readonly serverUrl: string;

  constructor(config: AiMemoryAdapterConfig) {
    this.binPath = config.binPath ?? process.env.AI_MEMORY_BIN ?? 'ai-memory';
    this.dataDir = config.dataDir;
    this.serverUrl = config.serverUrl ?? process.env.AI_MEMORY_SERVER_URL ?? 'http://127.0.0.1:49374';
  }

  async runSession(opts: RunSessionOptions): Promise<SessionInvocationResult> {
    const events = ['session-start', 'user-prompt-submit', 'pre-tool-use', 'post-tool-use', 'stop'];
    const hooks: Record<string, unknown> = {};
    const eventNameByKey: Record<string, string> = {
      'session-start': 'SessionStart',
      'user-prompt-submit': 'UserPromptSubmit',
      'pre-tool-use': 'PreToolUse',
      'post-tool-use': 'PostToolUse',
      stop: 'Stop',
    };
    for (const event of events) {
      hooks[eventNameByKey[event]] = [hookEntry(this.binPath, this.dataDir, this.serverUrl, event)];
    }

    const mcpConfig = JSON.stringify({
      mcpServers: {
        'ai-memory': {
          command: this.binPath,
          args: ['serve', '--transport', 'stdio', '--data-dir', this.dataDir],
        },
      },
    });

    return runClaudeCli({
      ...opts,
      candidate: this.name,
      settingsOverride: { model: opts.model, hooks },
      mcpConfigs: [mcpConfig],
      strictMcpConfig: false,
    });
  }
}
