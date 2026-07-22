import open from 'open';
import { createApp } from './app.js';

export interface ServerOptions {
  port?: number;
  open?: boolean;
}

export async function startServer(options: ServerOptions = {}): Promise<void> {
  const port = options.port ?? 3456;
  const app = createApp();

  return new Promise((resolve) => {
    const server = app.listen(port, async () => {
      const url = `http://localhost:${port}`;
      console.log(`show-me-tokens web UI running at ${url}`);
      if (options.open) {
        await open(url);
      }
      resolve();
    });

    server.on('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    });
  });
}
