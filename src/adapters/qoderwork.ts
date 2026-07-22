import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AgentAdapter } from './base.js';
import { SessionFilters, SessionUsage } from '../shared/types.js';
import { createTokenSummary, recomputeTotal } from '../models/index.js';

const TOKEN_KEY_RE = /(^|_)(prompt|input|completion|output|generated|total|cached)_?tokens?$/i;

export class QoderWorkAdapter extends AgentAdapter {
  readonly name = 'qoderwork';

  defaultDbPath(): string {
    return path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'QoderWork',
      'data',
      'agents.db'
    );
  }

  collectSessions(dbPath: string, filters: SessionFilters): SessionUsage[] {
    if (!this._fileExists(dbPath)) {
      throw new Error(`QoderWork database not found: ${dbPath}`);
    }
    const db = new Database(dbPath, { readonly: true });
    try {
      const rows = db
        .prepare(
          `
          SELECT
            sc.id AS sub_chat_id,
            sc.name AS sub_chat_name,
            sc.chat_id,
            sc.session_id,
            sc.mode,
            sc.model_level,
            sc.ext,
            sc.created_at AS sub_chat_created_at,
            sc.updated_at AS sub_chat_updated_at,
            c.name AS chat_name,
            c.worktree_path,
            c.chat_type,
            p.name AS project_name,
            p.path AS project_path
          FROM sub_chats sc
          JOIN chats c ON c.id = sc.chat_id
          JOIN projects p ON p.id = c.project_id
          ORDER BY COALESCE(sc.updated_at, sc.created_at, 0) DESC
          `
        )
        .all() as Array<{
          sub_chat_id: string;
          sub_chat_name: string | null;
          chat_id: string;
          session_id: string | null;
          mode: string | null;
          model_level: string | null;
          ext: string | null;
          sub_chat_created_at: number | null;
          sub_chat_updated_at: number | null;
          chat_name: string | null;
          worktree_path: string | null;
          chat_type: string | null;
          project_name: string | null;
          project_path: string | null;
        }>;

      const sessions: SessionUsage[] = [];
      for (const row of rows) {
        const usage = this._buildSession(db, row, filters);
        if (usage !== null) {
          sessions.push(usage);
        }
      }
      return sessions;
    } finally {
      db.close();
    }
  }

  private _buildSession(
    db: Database.Database,
    row: {
      sub_chat_id: string;
      sub_chat_name: string | null;
      chat_id: string;
      session_id: string | null;
      mode: string | null;
      model_level: string | null;
      ext: string | null;
      sub_chat_created_at: number | null;
      sub_chat_updated_at: number | null;
      chat_name: string | null;
      worktree_path: string | null;
      chat_type: string | null;
      project_name: string | null;
      project_path: string | null;
    },
    filters: SessionFilters
  ): SessionUsage | null {
    const subChatId = row.sub_chat_id;
    const sessionId = row.session_id ?? subChatId;

    if (filters.sessionId !== undefined) {
      if (filters.sessionId !== subChatId && filters.sessionId !== sessionId) {
        return null;
      }
    }

    const workspacePath = this._normalizePath(row.worktree_path ?? row.project_path);
    if (filters.workspace !== undefined) {
      if (workspacePath === null) {
        return null;
      }
      try {
        if (path.resolve(workspacePath) !== path.resolve(filters.workspace)) {
          return null;
        }
      } catch {
        return null;
      }
    }

    const createdAt = this._epochToIso(row.sub_chat_created_at);
    const updatedAt = this._epochToIso(
      row.sub_chat_updated_at ?? row.sub_chat_created_at
    );

    if (!this._inDateRange(updatedAt, filters)) {
      return null;
    }

    const title =
      (row.sub_chat_name || row.chat_name) ?? subChatId;

    const ext = this._tryJson(row.ext);
    let modelName = this._extractExtModel(ext) ?? row.model_level;

    const messages = db
      .prepare(
        `
        SELECT sequence, role, parts, metadata
        FROM messages
        WHERE sub_chat_id = ?
        ORDER BY sequence ASC
        `
      )
      .all(subChatId) as Array<{
        sequence: number;
        role: string;
        parts: string | null;
        metadata: string | null;
      }>;

    const tokenSummary = createTokenSummary();
    let eventCount = 0;

    for (const msg of messages) {
      const parts = this._tryJson(msg.parts);
      const metadata = this._tryJson(msg.metadata);
      const events: Array<Record<string, unknown>> = [];
      this._collectTokenEvents(parts, events);
      this._collectTokenEvents(metadata, events);

      for (const event of events) {
        const inputTokens =
          this._numeric(
            event.prompt_tokens ??
              event.input_tokens ??
              event.promptTokens ??
              event.inputTokens
          );
        const outputTokens =
          this._numeric(
            event.completion_tokens ??
              event.output_tokens ??
              event.generated_tokens ??
              event.completionTokens ??
              event.outputTokens ??
              event.generatedTokens
          );
        const totalTokens = this._numeric(event.total_tokens ?? event.totalTokens);
        const cachedTokens = this._numeric(
          event.cached_tokens ?? event.cachedTokens
        );

        tokenSummary.inputTokens += inputTokens;
        tokenSummary.outputTokens += outputTokens;
        if (totalTokens) {
          tokenSummary.totalTokens = (tokenSummary.totalTokens ?? 0) + totalTokens;
        }
        if (cachedTokens) {
          tokenSummary.cacheReadInputTokens =
            (tokenSummary.cacheReadInputTokens ?? 0) + cachedTokens;
        }
        eventCount += 1;
      }

      if (modelName === null || modelName === undefined) {
        for (const source of [metadata, parts]) {
          const name = this._extractModelName(source);
          if (name) {
            modelName = name;
            break;
          }
        }
      }
    }

    recomputeTotal(tokenSummary);

    if (filters.modelName !== undefined) {
      const modelNameStr = typeof modelName === 'string' ? modelName : '';
      if (!modelNameStr.toLowerCase().includes(filters.modelName.toLowerCase())) {
        return null;
      }
    }

    let note: string | null = null;
    if (eventCount === 0) {
      note =
        'Token usage unavailable: no comparable token fields found in local agents.db';
      tokenSummary.totalTokens = null;
    }

    return {
      agent: this.name,
      sessionId,
      title,
      chatId: row.chat_id,
      projectName: row.project_name,
      workspacePath,
      modelName: modelName ?? null,
      createdAt,
      updatedAt,
      tokens: tokenSummary,
      note,
      rawSource: { sub_chat_id: subChatId, mode: row.mode },
    };
  }

  private _fileExists(dbPath: string): boolean {
    try {
      return fs.statSync(dbPath).isFile();
    } catch {
      return false;
    }
  }

  private _extractExtModel(data: unknown): string | null {
    if (!this._isRecord(data)) {
      return null;
    }
    const snapshot = data.contextUsageSnapshot;
    if (!this._isRecord(snapshot)) {
      return null;
    }
    const value = snapshot.model;
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    return null;
  }

  private _collectTokenEvents(value: unknown, events: Array<Record<string, unknown>>): void {
    if (value === null || value === undefined) {
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        this._collectTokenEvents(item, events);
      }
      return;
    }
    if (!this._isRecord(value)) {
      return;
    }

    const keys = Object.keys(value);
    if (keys.some((key) => TOKEN_KEY_RE.test(key))) {
      events.push(value);
    }

    for (const nested of Object.values(value)) {
      this._collectTokenEvents(nested, events);
    }
  }

  private _normalizePath(value: string | null): string | null {
    if (!value) {
      return null;
    }
    try {
      return path.resolve(value);
    } catch {
      return value;
    }
  }

  private _epochToIso(value: number | null): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    try {
      let ms = Number(value);
      if (Number.isNaN(ms)) {
        return null;
      }
      if (ms < 100000000000) {
        ms *= 1000;
      }
      return new Date(ms).toISOString();
    } catch {
      return null;
    }
  }

  private _inDateRange(value: string | null, filters: SessionFilters): boolean {
    if (value === null) {
      return true;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return true;
    }
    if (filters.since !== undefined) {
      const since = new Date(filters.since);
      if (date.getTime() < since.getTime()) {
        return false;
      }
    }
    if (filters.until !== undefined) {
      const until = new Date(filters.until);
      until.setDate(until.getDate() + 1);
      if (date.getTime() >= until.getTime()) {
        return false;
      }
    }
    return true;
  }

  private _tryJson(text: string | null): unknown {
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  private _extractModelName(data: unknown): string | null {
    if (!this._isRecord(data)) {
      return null;
    }
    const keys = [
      'model_name',
      'model',
      'modelId',
      'model_id',
      'modelLevel',
    ];
    for (const key of keys) {
      const value = data[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return null;
  }

  private _isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private _numeric(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }
    try {
      const num = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(num) && num >= 0 ? Math.floor(num) : 0;
    } catch {
      return 0;
    }
  }
}
