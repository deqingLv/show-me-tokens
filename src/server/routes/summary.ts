import { Router } from 'express';
import { getAdapter } from '../../adapters/registry.js';
import { collectAndSort } from '../../services/usageService.js';
import { buildFilters } from './sessions.js';
import { computeSummary } from '../../services/usageService.js';

const router = Router();

router.get('/', (req, res, next) => {
  try {
    const agentName = req.query.agent as string | undefined;
    if (!agentName) {
      res.status(400).json({ error: "Missing required query parameter 'agent'." });
      return;
    }

    const AdapterClass = getAdapter(agentName);
    const adapter = new AdapterClass();
    const dbPath = req.query.db as string | undefined ?? adapter.defaultDbPath();
    const filters = buildFilters(req);

    const sessions = collectAndSort(adapter, dbPath, filters);
    const summary = computeSummary(sessions);
    res.json({ agent: agentName, filters, summary });
  } catch (err) {
    next(err);
  }
});

export default router;
