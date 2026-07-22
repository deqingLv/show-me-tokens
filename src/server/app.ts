import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import agentsRouter from './routes/agents.js';
import sessionsRouter from './routes/sessions.js';
import summaryRouter from './routes/summary.js';
import exportRouter from './routes/export.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(): express.Application {
  const app = express();
  app.use(express.json());

  app.use('/api/agents', agentsRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/summary', summaryRouter);
  app.use('/api/export', exportRouter);

  // In production, the web build is served from dist/web next to dist/server.
  const webBuildPath = path.resolve(__dirname, '../web');
  app.use(express.static(webBuildPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(webBuildPath, 'index.html'));
  });

  app.use(errorHandler);
  return app;
}
