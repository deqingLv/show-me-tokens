import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { createApp } from '../../src/server/app.js';

function createMinimalDb(dbPath: string): void {
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
    'INSERT INTO chat_session VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    's1',
    'Hello',
    '{"preferred_model": "gm51model"}',
    'file:///Users/alice/proj',
    'p1',
    'proj',
    1781652000000,
    1781652000000,
    'complete'
  );
  db.prepare(
    'INSERT INTO chat_message VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    'm1',
    's1',
    'assistant',
    '{"prompt_tokens": 10, "completion_tokens": 2}',
    '{"model": "m"}',
    1781652000000
  );
  db.close();
}

describe('Server routes', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `server-test-${Date.now()}.db`);
    createMinimalDb(dbPath);
  });

  afterEach(() => {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('GET /api/agents returns supported agents', async () => {
    const app = createApp();
    const res = await request(app).get('/api/agents');
    expect(res.status).toBe(200);
    expect(res.body.agents).toContain('qoder');
    expect(res.body.agents).toContain('qoderwork');
  });

  it('GET /api/sessions returns sessions for agent', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/sessions')
      .query({ agent: 'qoder', db: dbPath });
    expect(res.status).toBe(200);
    expect(res.body.sessions).toHaveLength(1);
    expect(res.body.sessions[0].sessionId).toBe('s1');
  });

  it('GET /api/summary returns totals', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/summary')
      .query({ agent: 'qoder', db: dbPath });
    expect(res.status).toBe(200);
    expect(res.body.summary.totalSessions).toBe(1);
    expect(res.body.summary.inputTokens).toBe(10);
    expect(res.body.summary.outputTokens).toBe(2);
  });
});
