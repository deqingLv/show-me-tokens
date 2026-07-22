import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'node:path';
import os from 'node:os';
import { QoderWorkAdapter } from '../../src/adapters/qoderwork.js';
import { SessionFilters } from '../../src/shared/types.js';

function createQoderWorkDb(dbPath: string): void {
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE chats (
      id TEXT PRIMARY KEY,
      name TEXT,
      project_id TEXT NOT NULL,
      created_at INTEGER,
      updated_at INTEGER,
      worktree_path TEXT,
      chat_type TEXT
    );
    CREATE TABLE sub_chats (
      id TEXT PRIMARY KEY,
      name TEXT,
      chat_id TEXT NOT NULL,
      session_id TEXT,
      mode TEXT,
      messages TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      model_level TEXT,
      ext TEXT
    );
    CREATE TABLE messages (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      sub_chat_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      role TEXT NOT NULL,
      parts TEXT,
      metadata TEXT,
      searchable_text TEXT,
      created_at INTEGER
    );
  `);

  db.prepare('INSERT INTO projects (id, name, path) VALUES (?, ?, ?)').run(
    'proj-1',
    'project-a',
    '/Users/alice/project-a'
  );
  db.prepare(
    'INSERT INTO chats (id, name, project_id, worktree_path) VALUES (?, ?, ?, ?)'
  ).run('chat-1', 'hello', 'proj-1', '/Users/alice/project-a');
  db.prepare(
    `INSERT INTO sub_chats (id, name, chat_id, session_id, mode, created_at, updated_at, model_level, ext)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    'sub-1',
    '计算节点数量',
    'chat-1',
    'session-1',
    'agent',
    1781652000,
    1781652200,
    'qwork-auto',
    '{"contextUsageSnapshot":{"model":"qwork-ultimate"}}'
  );

  const parts = JSON.stringify([
    {
      type: 'usage',
      prompt_tokens: 100,
      completion_tokens: 20,
      cached_tokens: 30,
    },
  ]);
  const metadata = JSON.stringify({ model: 'GLM-5.2' });
  db.prepare(
    `INSERT INTO messages (id, message_id, chat_id, sub_chat_id, sequence, role, parts, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run('msg-1', 'm1', 'chat-1', 'sub-1', 1, 'assistant', parts, metadata, 1781652100);

  db.close();
}

describe('QoderWorkAdapter', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `qoderwork-test-${Date.now()}.db`);
    createQoderWorkDb(dbPath);
  });

  it('collects sessions with tokens and model names', () => {
    const adapter = new QoderWorkAdapter();
    const sessions = adapter.collectSessions(dbPath, {});

    expect(sessions).toHaveLength(1);
    const usage = sessions[0];
    expect(usage.agent).toBe('qoderwork');
    expect(usage.sessionId).toBe('session-1');
    expect(usage.title).toBe('计算节点数量');
    expect(usage.modelName).toBe('qwork-ultimate');
    expect(usage.tokens.inputTokens).toBe(100);
    expect(usage.tokens.outputTokens).toBe(20);
    expect(usage.tokens.cacheReadInputTokens).toBe(30);
    expect(usage.tokens.totalTokens).toBe(120);
  });

  it('falls back title and model when primary fields missing', () => {
    const db = new Database(dbPath);
    db.prepare('UPDATE sub_chats SET name = ?, ext = ?').run('', '{}');
    db.close();

    const adapter = new QoderWorkAdapter();
    const sessions = adapter.collectSessions(dbPath, {});

    expect(sessions).toHaveLength(1);
    expect(sessions[0].title).toBe('hello');
    expect(sessions[0].modelName).toBe('qwork-auto');
  });

  it('reports unavailable token status', () => {
    const db = new Database(dbPath);
    db.prepare('UPDATE messages SET parts = ?, metadata = ?').run('[]', '{}');
    db.close();

    const adapter = new QoderWorkAdapter();
    const sessions = adapter.collectSessions(dbPath, {});

    expect(sessions).toHaveLength(1);
    expect(sessions[0].tokens.totalTokens).toBeNull();
    expect(sessions[0].note?.toLowerCase()).toContain('unavailable');
  });

  it('filters by model name', () => {
    const adapter = new QoderWorkAdapter();
    const sessions = adapter.collectSessions(dbPath, {
      modelName: 'qwork-ultimate',
    } as SessionFilters);

    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionId).toBe('session-1');
  });
});
