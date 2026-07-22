import { SessionUsage } from '../shared/types.js';

const COLUMNS = [
  'agent',
  'session_id',
  'title',
  'chat_id',
  'project_name',
  'workspace_path',
  'model_name',
  'created_at',
  'updated_at',
  'input_tokens',
  'output_tokens',
  'cache_read_input_tokens',
  'cache_creation_input_tokens',
  'total_tokens',
  'estimated_cost_usd',
  'pricing_model_id',
  'pricing_provider',
  'note',
];

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function formatCsv(sessions: SessionUsage[]): string {
  const lines: string[] = [COLUMNS.join(',')];
  for (const usage of sessions) {
    const row = [
      usage.agent,
      usage.sessionId,
      usage.title ?? '',
      usage.chatId ?? '',
      usage.projectName ?? '',
      usage.workspacePath ?? '',
      usage.modelName ?? '',
      usage.createdAt ?? '',
      usage.updatedAt ?? '',
      usage.tokens.inputTokens,
      usage.tokens.outputTokens,
      usage.tokens.cacheReadInputTokens ?? '',
      usage.tokens.cacheCreationInputTokens ?? '',
      usage.tokens.totalTokens ?? '',
      usage.pricing?.costUsd ?? '',
      usage.pricing?.modelId ?? '',
      usage.pricing?.provider ?? '',
      usage.note ?? '',
    ];
    lines.push(row.map(escapeCsv).join(','));
  }
  return lines.join('\n') + '\n';
}
