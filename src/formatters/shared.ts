import { SessionUsage, TokenSummary } from '../shared/types.js';

export function tokenSummaryToDict(tokens: TokenSummary): Record<string, unknown> {
  return {
    input_tokens: tokens.inputTokens,
    output_tokens: tokens.outputTokens,
    cache_read_input_tokens: tokens.cacheReadInputTokens,
    cache_creation_input_tokens: tokens.cacheCreationInputTokens,
    total_tokens: tokens.totalTokens,
  };
}

export function usageToDict(usage: SessionUsage): Record<string, unknown> {
  return {
    agent: usage.agent,
    session_id: usage.sessionId,
    title: usage.title,
    chat_id: usage.chatId,
    project_name: usage.projectName,
    workspace_path: usage.workspacePath,
    model_name: usage.modelName,
    created_at: usage.createdAt,
    updated_at: usage.updatedAt,
    tokens: tokenSummaryToDict(usage.tokens),
    estimated_cost_usd: usage.pricing?.costUsd ?? null,
    pricing: usage.pricing ?? null,
    note: usage.note,
    raw_source: usage.rawSource,
  };
}
