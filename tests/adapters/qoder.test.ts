import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'node:path';
import os from 'node:os';
import { QoderAdapter } from '../../src/adapters/qoder.js';
import { SessionFilters } from '../../src/shared/types.js';

function createQoderDb(dbPath: string): void {
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE chat_session (
      session_id TEXT PRIMARY KEY,
      session_title TEXT,
      preferred_model_info TEXT,
      project_uri TEXT,
      project_id TEXT,
      project_name TEXT,
      gmt_create INTEGER,
      gmt_modified INTEGER,
      status TEXT
    );
    CREATE TABLE chat_message (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      token_info TEXT,
      model_info TEXT,
      gmt_create INTEGER
    );
  `);

  db.prepare(
    `INSERT INTO chat_session
     (session_id, session_title, preferred_model_info, project_uri, project_id, project_name, gmt_create, gmt_modified, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    'session-1',
    'Project A summary',
    '{"preferred_model": "gm51model"}',
    'file:///Users/alice/project-a',
    'proj-1',
    'project-a',
    1781652000000,
    1781652200000,
    'complete'
  );

  db.prepare(
    `INSERT INTO chat_session
     (session_id, session_title, preferred_model_info, project_uri, project_id, project_name, gmt_create, gmt_modified, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    'session-2',
    '',
    '{}',
    'file:///Users/alice/project-b',
    'proj-2',
    'project-b',
    1781652000000,
    1781652000000,
    'complete'
  );

  db.prepare(
    `INSERT INTO chat_message (id, session_id, role, token_info, model_info, gmt_create) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    'msg-1',
    'session-1',
    'assistant',
    '{"prompt_tokens": 100, "completion_tokens": 20, "cached_tokens": 50}',
    '{"model_name": "GLM-5.1"}',
    1781652100000
  );

  db.prepare(
    `INSERT INTO chat_message (id, session_id, role, token_info, model_info, gmt_create) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    'msg-2',
    'session-1',
    'assistant',
    '{"prompt_tokens": 80, "completion_tokens": 10}',
    '{}',
    1781652200000
  );

  db.close();
}

describe('QoderAdapter', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `qoder-test-${Date.now()}.db`);
    createQoderDb(dbPath);
  });

  it('collects sessions with tokens and model names', () => {
    const adapter = new QoderAdapter();
    const sessions = adapter.collectSessions(dbPath, {});

    expect(sessions).toHaveLength(2);
    const first = sessions[0];
    expect(first.agent).toBe('qoder');
    expect(first.sessionId).toBe('session-1');
    expect(first.title).toBe('Project A summary');
    expect(first.modelName).toBe('gm51model');
    expect(first.tokens.inputTokens).toBe(180);
    expect(first.tokens.outputTokens).toBe(30);
    expect(first.tokens.cacheReadInputTokens).toBe(50);
    expect(first.tokens.totalTokens).toBe(210);
    expect(first.workspacePath).toContain('project-a');
  });

  it('falls back title to session id', () => {
    const adapter = new QoderAdapter();
    const sessions = adapter.collectSessions(dbPath, {});
    const second = sessions.find((s) => s.sessionId === 'session-2')!;
    expect(second.title).toBe('session-2');
  });

  it('filters by session id', () => {
    const adapter = new QoderAdapter();
    const sessions = adapter.collectSessions(
      dbPath,
      ({ sessionId: 'session-2' })
    );
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionId).toBe('session-2');
  });

  it('filters by workspace', () => {
    const adapter = new QoderAdapter();
    const workspace = path.resolve('/Users/alice/project-a');
    const sessions = adapter.collectSessions(
      dbPath,
      ({ workspace })
    );
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionId).toBe('session-1');
  });

  it('filters by model name', () => {
    const adapter = new QoderAdapter();
    const sessions = adapter.collectSessions(
      dbPath,
      ({ modelName: 'gm51' })
    );
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionId).toBe('session-1');
  });

  it('falls back model key from message model_info', () => {
    const db = new Database(dbPath);
    db.exec('DELETE FROM chat_session; DELETE FROM chat_message;');
    db.prepare(
      `INSERT INTO chat_session (session_id, session_title, preferred_model_info, project_uri, project_id, project_name, gmt_create, gmt_modified, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('s1', '', '{}', 'file:///p', 'p', 'p', 0, 0, 'complete');
    db.prepare(
      `INSERT INTO chat_message (id, session_id, role, token_info, model_info, gmt_create) VALUES (?, ?, ?, ?, ?, ?)`
    ).run('m1', 's1', 'assistant', '{"prompt_tokens": 1, "completion_tokens": 1}', '{"model_key": "gm51model"}', 0);
    db.close();

    const adapter = new QoderAdapter();
    const sessions = adapter.collectSessions(dbPath, {});
    expect(sessions).toHaveLength(1);
    expect(sessions[0].modelName).toBe('gm51model');
  });

  it('default db path contains Qoder', () => {
    const adapter = new QoderAdapter();
    expect(adapter.defaultDbPath()).toContain('Qoder');
  });
});
