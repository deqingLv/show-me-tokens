import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import Database from 'better-sqlite3';
import os from 'node:os';
import fs from 'node:fs';

const CLI = path.resolve(__dirname, '../../src/cli.ts');
const TSX = path.resolve(__dirname, '../../node_modules/.bin/tsx');

function run(args: string): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync(TSX, [CLI, ...args.split(/\s+/)], {
    encoding: 'utf-8',
    cwd: path.resolve(__dirname, '../..'),
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
  };
}

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

describe('CLI', () => {
  it('lists agents', () => {
    const { stdout, exitCode } = run('agents');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('qoder');
    expect(stdout).toContain('qoderwork');
  });

  it('reports qoder sessions as json', () => {
    const dbPath = path.join(os.tmpdir(), `cli-qoder-${Date.now()}.db`);
    createMinimalDb(dbPath);
    try {
      const { stdout, exitCode } = run(`qoder --db ${dbPath} --format json`);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('"session_id": "s1"');
    } finally {
      fs.unlinkSync(dbPath);
    }
  });

  it('returns exit code 2 for missing db', () => {
    const dbPath = path.join(os.tmpdir(), `cli-missing-${Date.now()}.db`);
    const { exitCode, stderr } = run(`qoder --db ${dbPath}`);
    expect(exitCode).toBe(2);
    expect(stderr).toContain('not found');
  });

  it('reports no matching sessions with exit code 0', () => {
    const dbPath = path.join(os.tmpdir(), `cli-empty-${Date.now()}.db`);
    createMinimalDb(dbPath);
    try {
      const { stderr, exitCode } = run(`qoder --db ${dbPath} --session-id unknown`);
      expect(exitCode).toBe(0);
      expect(stderr).toContain('No sessions');
    } finally {
      fs.unlinkSync(dbPath);
    }
  });

  it('supports short filter options', () => {
    const dbPath = path.join(os.tmpdir(), `cli-filter-${Date.now()}.db`);
    createMinimalDb(dbPath);
    try {
      const { stdout, exitCode } = run(`qoder --db ${dbPath} -s s1 -m gm51 --format json`);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('"session_id": "s1"');
    } finally {
      fs.unlinkSync(dbPath);
    }
  });
});
