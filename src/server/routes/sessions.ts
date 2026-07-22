import { Router, Request } from 'express';
import path from 'node:path';
import os from 'node:os';
import { getAdapter } from '../../adapters/registry.js';
import { SessionFilters } from '../../shared/types.js';
import { collectAndSort } from '../../services/usageService.js';

const router = Router();

function expandPath(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  return path.resolve(value.replace(/^~(?=$|\/|\\)/, os.homedir()));
}

function parseDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.slice(0, 10);
}

export function buildFilters(req: Request): SessionFilters {
  return {
    since: parseDate(req.query.since as string | undefined),
    until: parseDate(req.query.until as string | undefined),
    workspace: expandPath(req.query.workspace as string | undefined),
    sessionId: (req.query.sessionId as string | undefined) || undefined,
    modelName: (req.query.model as string | undefined) || undefined,
  };
}

router.get('/', (req, res, next) => {
  try {
    const agentName = req.query.agent as string | undefined;
    if (!agentName) {
      res.status(400).json({ error: "Missing required query parameter 'agent'." });
      return;
    }

    const AdapterClass = getAdapter(agentName);
    const adapter = new AdapterClass();
    const dbPath = expandPath(req.query.db as string | undefined) ?? adapter.defaultDbPath();
    const filters = buildFilters(req);
    const limitParam = req.query.limit as string | undefined;
    const limit = limitParam !== undefined ? Number(limitParam) : undefined;

    const sessions = collectAndSort(adapter, dbPath, filters, limit);
    res.json({ agent: agentName, count: sessions.length, sessions });
  } catch (err) {
    next(err);
  }
});

export default router;
