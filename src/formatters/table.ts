import path from 'node:path';
import { formatUsd } from '../pricing/huggingface.js';
import { SessionUsage, TokenSummary } from '../shared/types.js';

const HEADERS = [
  'Agent',
  'Session ID',
  'Title',
  'Workspace',
  'Model',
  'Input',
  'Cache Read',
  'Output',
  'Total',
  'HF Cost',
];

export function formatTable(sessions: SessionUsage[]): string {
  if (sessions.length === 0) {
    return 'No sessions matched the filters.';
  }

  const rows: string[][] = [];
  for (const usage of sessions) {
    const tokens = usage.tokens;
    rows.push([
      usage.agent,
      usage.sessionId,
      shorten(usage.title ?? '', 30),
      workspaceName(usage.workspacePath),
      usage.modelName ?? '-',
      fmt(tokens.inputTokens),
      fmt(tokens.cacheReadInputTokens),
      fmt(tokens.outputTokens),
      fmt(tokens.totalTokens),
      formatUsd(usage.pricing?.costUsd),
    ]);
  }

  const totals = computeTotals(sessions);
  rows.push(rows[0].map((cell) => '-'.repeat(cell.length)));
  rows.push([
    'Total',
    '',
    '',
    '',
    '',
    fmt(totals.inputTokens),
    fmt(totals.cacheReadInputTokens),
    fmt(totals.outputTokens),
    fmt(totals.totalTokens),
    formatUsd(computeTotalCostUsd(sessions)),
  ]);

  const widths = HEADERS.map((h) => h.length);
  for (const row of rows) {
    for (let i = 0; i < HEADERS.length; i++) {
      widths[i] = Math.max(widths[i], row[i].length);
    }
  }

  const lines: string[] = [];
  lines.push(
    HEADERS.map((h, i) => h.padEnd(widths[i])).join('  ')
  );
  for (const row of rows) {
    lines.push(row.map((cell, i) => cell.padEnd(widths[i])).join('  '));
  }

  const notes = sessions
    .map((u) => u.note)
    .filter((n): n is string => Boolean(n));
  if (notes.length > 0) {
    lines.push('');
    lines.push('Notes:');
    for (const note of notes) {
      lines.push(`  - ${note}`);
    }
  }

  return lines.join('\n');
}

function fmt(value: number | null): string {
  if (value === null || value === undefined) {
    return '-';
  }
  return value.toLocaleString('en-US');
}

function shorten(value: string, maxLen: number): string {
  if (value.length <= maxLen) {
    return value;
  }
  return value.slice(0, maxLen - 3) + '...';
}

function workspaceName(value: string | null): string {
  if (!value) {
    return 'default';
  }
  const base = path.basename(value);
  return base || 'default';
}

function computeTotalCostUsd(sessions: SessionUsage[]): number | null {
  const total = sessions.reduce(
    (sum, u) => sum + (u.pricing?.costUsd ?? 0),
    0
  );
  return total || null;
}

function computeTotals(sessions: SessionUsage[]): TokenSummary {
  const inputTokens = sessions.reduce(
    (sum, u) => sum + u.tokens.inputTokens,
    0
  );
  const outputTokens = sessions.reduce(
    (sum, u) => sum + u.tokens.outputTokens,
    0
  );
  const cacheRead = sessions.reduce(
    (sum, u) => sum + (u.tokens.cacheReadInputTokens ?? 0),
    0
  );
  const cacheCreation = sessions.reduce(
    (sum, u) => sum + (u.tokens.cacheCreationInputTokens ?? 0),
    0
  );
  const total = sessions.reduce(
    (sum, u) => sum + (u.tokens.totalTokens ?? 0),
    0
  );
  return {
    inputTokens,
    outputTokens,
    cacheReadInputTokens: cacheRead || null,
    cacheCreationInputTokens: cacheCreation || null,
    totalTokens: total || null,
  };
}
