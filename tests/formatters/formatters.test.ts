import { describe, it, expect } from 'vitest';
import { formatJson } from '../../src/formatters/json.js';
import { formatCsv } from '../../src/formatters/csv.js';
import { formatTable } from '../../src/formatters/table.js';
import { SessionUsage } from '../../src/shared/types.js';
import { createTokenSummary } from '../../src/models/index.js';

function sampleSessions(): SessionUsage[] {
  return [
    {
      agent: 'qoder',
      sessionId: 'session-1',
      title: 'Hello world',
      chatId: null,
      projectName: null,
      workspacePath: '/Users/alice/project-a',
      modelName: 'GLM-5.1',
      createdAt: '2026-07-21T12:00:00.000Z',
      updatedAt: '2026-07-21T12:00:00.000Z',
      tokens: createTokenSummary({
        inputTokens: 100,
        outputTokens: 20,
        cacheReadInputTokens: 50,
        totalTokens: 120,
      }),
      note: null,
      rawSource: null,
    },
  ];
}

describe('formatTable', () => {
  it('includes headers and total', () => {
    const text = formatTable(sampleSessions());
    expect(text).toContain('Agent');
    expect(text).toContain('Title');
    expect(text).toContain('session-1');
    expect(text).toContain('Hello world');
    expect(text).toContain('GLM-5.1');
    expect(text).toContain('120');
    expect(text).toContain('Total');
  });

  it('shows workspace name or default', () => {
    const withWorkspace = sampleSessions();
    const text = formatTable(withWorkspace);
    expect(text).toContain('project-a');
    expect(text).not.toContain('/Users/alice/project-a');

    const withoutWorkspace = [
      { ...withWorkspace[0], workspacePath: null },
    ];
    expect(formatTable(withoutWorkspace)).toContain('default');
  });

  it('returns no sessions message when empty', () => {
    expect(formatTable([])).toContain('No sessions');
  });
});

describe('formatJson', () => {
  it('outputs valid json', () => {
    const text = formatJson(sampleSessions());
    expect(text).toContain('"agent": "qoder"');
    expect(text).toContain('"input_tokens": 100');
  });
});

describe('formatCsv', () => {
  it('outputs csv rows', () => {
    const text = formatCsv(sampleSessions());
    const lines = text.trim().split('\n');
    expect(lines[0]).toContain('agent,session_id');
    expect(lines[1]).toContain('qoder,session-1');
  });
});
