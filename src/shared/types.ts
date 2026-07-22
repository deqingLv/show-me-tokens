export interface TokenSummary {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number | null;
  cacheCreationInputTokens: number | null;
  totalTokens: number | null;
}

export interface TokenCostEstimate {
  source: string;
  pricingUrl: string;
  modelId: string;
  provider: string;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  costUsd: number;
}

export interface SessionUsage {
  agent: string;
  sessionId: string;
  title: string | null;
  chatId: string | null;
  projectName: string | null;
  workspacePath: string | null;
  modelName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  tokens: TokenSummary;
  pricing?: TokenCostEstimate | null;
  note: string | null;
  rawSource: Record<string, unknown> | null;
}

export interface SessionFilters {
  since?: string;
  until?: string;
  workspace?: string;
  sessionId?: string;
  modelName?: string;
}

export interface SessionSummary {
  totalSessions: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  totalTokens: number;
}

export type OutputFormat = 'table' | 'json' | 'csv';
