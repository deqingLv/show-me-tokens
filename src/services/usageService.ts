import { AgentAdapter } from '../adapters/base.js';
import { estimateHuggingFaceCostUsd } from '../pricing/huggingface.js';
import { SessionFilters, SessionUsage, SessionSummary } from '../shared/types.js';

export function collectAndSort(
  adapter: AgentAdapter,
  dbPath: string,
  filters: SessionFilters,
  limit?: number
): SessionUsage[] {
  const sessions = adapter.collectSessions(dbPath, filters).map((session) => ({
    ...session,
    pricing: estimateHuggingFaceCostUsd(session),
  }));
  const sorted = [...sessions].sort((a, b) => {
    const totalA = a.tokens.totalTokens ?? 0;
    const totalB = b.tokens.totalTokens ?? 0;
    return totalB - totalA;
  });
  if (limit !== undefined && limit > 0) {
    return sorted.slice(0, limit);
  }
  return sorted;
}

export function computeSummary(sessions: SessionUsage[]): SessionSummary {
  return {
    totalSessions: sessions.length,
    inputTokens: sessions.reduce((sum, u) => sum + u.tokens.inputTokens, 0),
    outputTokens: sessions.reduce((sum, u) => sum + u.tokens.outputTokens, 0),
    cacheReadInputTokens: sessions.reduce(
      (sum, u) => sum + (u.tokens.cacheReadInputTokens ?? 0),
      0
    ),
    totalTokens: sessions.reduce(
      (sum, u) => sum + (u.tokens.totalTokens ?? 0),
      0
    ),
  };
}
