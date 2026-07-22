import { Router } from 'express';
import { getAdapter } from '../../adapters/registry.js';
import { collectAndSort } from '../../services/usageService.js';
import { buildFilters } from './sessions.js';
import { formatJson } from '../../formatters/json.js';
import { formatCsv } from '../../formatters/csv.js';
import { OutputFormat } from '../../shared/types.js';

const router = Router();

router.get('/', (req, res, next) => {
  try {
    const agentName = req.query.agent as string | undefined;
    if (!agentName) {
      res.status(400).json({ error: "Missing required query parameter 'agent'." });
      return;
    }

    const format = (req.query.format as string | undefined) ?? 'json';
    if (format !== 'json' && format !== 'csv') {
      res.status(400).json({ error: "Format must be 'json' or 'csv'." });
      return;
    }

    const AdapterClass = getAdapter(agentName);
    const adapter = new AdapterClass();
    const dbPath = req.query.db as string | undefined ?? adapter.defaultDbPath();
    const filters = buildFilters(req);

    const sessions = collectAndSort(adapter, dbPath, filters);
    const output = format === 'json' ? formatJson(sessions) : formatCsv(sessions);
    const filename = `show-me-tokens-${agentName}-${new Date().toISOString().slice(0, 10)}.${format}`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader(
      'Content-Type',
      format === 'json' ? 'application/json' : 'text/csv'
    );
    res.send(output);
  } catch (err) {
    next(err);
  }
});

export default router;
