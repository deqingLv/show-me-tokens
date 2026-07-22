import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { AgentAdapter } from './base.js';
import { SessionFilters, SessionUsage } from '../shared/types.js';
import { createTokenSummary, recomputeTotal } from '../models/index.js';

export class QoderAdapter extends AgentAdapter {
  readonly name = 'qoder';

  defaultDbPath(): string {
    return path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'Qoder',
      'SharedClientCache',
      'cache',
      'db',
      'local.db'
    );
  }

  collectSessions(dbPath: string, filters: SessionFilters): SessionUsage[] {
    if (!this._fileExists(dbPath)) {
      throw new Error(`Qoder database not found: ${dbPath}`);
    }
    const db = new Database(dbPath, { readonly: true });
    try {
      const rows = db
        .prepare(
          `
          SELECT
            session_id,
            session_title,
            preferred_model_info,
            project_uri,
            project_id,
            project_name,
            gmt_create,
            gmt_modified,
            status
          FROM chat_session
          ORDER BY COALESCE(gmt_modified, gmt_create, 0) DESC
          `
        )
        .all() as Array<{
          session_id: string;
          session_title: string | null;
          preferred_model_info: string | null;
          project_uri: string | null;
          project_id: string | null;
          project_name: string | null;
          gmt_create: number | null;
          gmt_modified: number | null;
          status: string | null;
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
    sessionRow: {
      session_id: string;
      session_title: string | null;
      preferred_model_info: string | null;
      project_uri: string | null;
      project_id: string | null;
      project_name: string | null;
      gmt_create: number | null;
      gmt_modified: number | null;
      status: string | null;
    },
    filters: SessionFilters
  ): SessionUsage | null {
    const sessionId = sessionRow.session_id;

    if (filters.sessionId !== undefined && filters.sessionId !== sessionId) {
      return null;
    }

    const workspacePath = this._normalizeWorkspace(sessionRow.project_uri);
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

    const createdAt = this._msToIso(sessionRow.gmt_create);
    const updatedAt = this._msToIso(sessionRow.gmt_modified ?? sessionRow.gmt_create);

    if (!this._inDateRange(updatedAt, filters)) {
      return null;
    }

    const title = this._extractTitle(sessionRow);
    const preferredModel = this._tryJson(sessionRow.preferred_model_info);
    let modelName = this._extractPreferredModel(preferredModel);

    const messages = db
      .prepare(
        `
        SELECT
          id,
          role,
          token_info,
          model_info,
          gmt_create
        FROM chat_message
        WHERE session_id = ?
        ORDER BY gmt_create, id
        `
      )
      .all(sessionId) as Array<{
        id: string;
        role: string;
        token_info: string | null;
        model_info: string | null;
        gmt_create: number | null;
      }>;

    const tokenSummary = createTokenSummary();

    for (const msg of messages) {
      const tokenInfo = this._tryJson(msg.token_info);
      if (this._isRecord(tokenInfo)) {
        tokenSummary.inputTokens += this._int(tokenInfo.prompt_tokens);
        tokenSummary.outputTokens += this._int(tokenInfo.completion_tokens);
        const cache = tokenInfo.cached_tokens;
        if (cache !== undefined && cache !== null) {
          tokenSummary.cacheReadInputTokens =
            (tokenSummary.cacheReadInputTokens ?? 0) + this._int(cache);
        }
      }

      if (modelName === null) {
        const messageModelInfo = this._tryJson(msg.model_info);
        modelName = this._extractModelName(messageModelInfo);
        if (modelName === null && this._isRecord(tokenInfo)) {
          modelName = this._extractModelName(tokenInfo);
        }
      }
    }

    recomputeTotal(tokenSummary);

    if (filters.modelName !== undefined) {
      if (modelName === null || !modelName.toLowerCase().includes(filters.modelName.toLowerCase())) {
        return null;
      }
    }

    return {
      agent: this.name,
      sessionId,
      title,
      chatId: null,
      projectName: sessionRow.project_name,
      workspacePath,
      modelName,
      createdAt,
      updatedAt,
      tokens: tokenSummary,
      note: null,
      rawSource: { project_id: sessionRow.project_id },
    };
  }

  private _fileExists(dbPath: string): boolean {
    try {
      return fs.statSync(dbPath).isFile();
    } catch {
      return false;
    }
  }

  private _extractTitle(sessionRow: {
    session_title: string | null;
    session_id: string;
  }): string {
    const title = sessionRow.session_title;
    if (typeof title === 'string' && title.trim()) {
      return title.trim();
    }
    return sessionRow.session_id;
  }

  private _extractPreferredModel(data: unknown): string | null {
    if (!this._isRecord(data)) {
      return null;
    }
    const value = data.preferred_model;
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    return null;
  }

  private _normalizeWorkspace(value: string | null): string | null {
    if (!value) {
      return null;
    }
    let text = value.trim();
    if (text.startsWith('file://')) {
      try {
        text = fileURLToPath(text);
      } catch {
        text = decodeURIComponent(text.replace(/^file:\/\/+/, '/'));
      }
    }
    try {
      return path.resolve(text);
    } catch {
      return text;
    }
  }

  private _msToIso(value: number | null): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    try {
      return new Date(value).toISOString();
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
    const keys = ['model_name', 'model_key', 'model', 'modelId', 'model_id'];
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

  private _int(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
  }
}
