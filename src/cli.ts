#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { startServer } from './server/launcher.js';
import { getAdapter, listAdapterNames } from './adapters/registry.js';
import { formatTable } from './formatters/table.js';
import { formatJson } from './formatters/json.js';
import { formatCsv } from './formatters/csv.js';
import {
  OutputFormat,
  SessionFilters,
  SessionUsage,
} from './shared/types.js';
import { collectAndSort } from './services/usageService.js';

const FORMATTERS: Record<OutputFormat, (sessions: SessionUsage[]) => string> = {
  table: formatTable,
  json: formatJson,
  csv: formatCsv,
};

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
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/.test(value)) {
    throw new Error(
      `Invalid date ${value}. Expected YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS.`
    );
  }
  return value.slice(0, 10);
}

export async function main(argv: string[] = process.argv): Promise<number> {
  // Handle web server mode before commander parsing so --serve can coexist with
  // commander subcommands without ambiguity.
  const rawArgs = argv.slice(2);
  if (rawArgs.length === 0) {
    await startServer({ open: true });
    return 0;
  }

  if (rawArgs.includes('--serve')) {
    const portIndex = rawArgs.indexOf('--port');
    const port = portIndex >= 0 ? Number(rawArgs[portIndex + 1]) : undefined;
    const shouldOpen = rawArgs.includes('--open');
    await startServer({ port, open: shouldOpen });
    return 0;
  }

  const program = new Command();
  program.name('show-me-tokens');
  program.description(
    'Report per-session token usage of AI IDE agents.'
  );
  program.option('--verbose', 'Show full traceback on errors.');

  program
    .command('agents')
    .description('List supported agent adapters.')
    .action(() => {
      console.log('Supported agents:');
      for (const name of listAdapterNames()) {
        console.log(`  - ${name}`);
      }
    });

  for (const name of listAdapterNames()) {
    const adapterClass = getAdapter(name);
    const adapter = new adapterClass();

    program
      .command(name)
      .description(`Report token usage from ${adapterClass.name}.`)
      .option('--db <path>', 'Path to the local SQLite database (default: auto-detect).')
      .option('--since <date>', 'Include sessions updated on or after this date (YYYY-MM-DD).', parseDate)
      .option('--until <date>', 'Include sessions updated on or before this date (YYYY-MM-DD).', parseDate)
      .option('--workspace <path>', 'Filter by workspace/project path.')
      .option('--ws <path>', 'Alias for --workspace.')
      .option('-s, --session-id <id>', 'Filter by session ID.')
      .option('-m, --model <name>', 'Filter by model key/name (substring match).')
      .option('--format <format>', 'Output format: table, json, csv.', 'table')
      .option('--limit <n>', 'Maximum number of sessions to display.', parseInt)
      .action(async (options) => {
        const dbPath = expandPath(options.db) ?? adapter.defaultDbPath();
        const filters: SessionFilters = {
          since: options.since,
          until: options.until,
          workspace: expandPath(options.workspace ?? options.ws),
          sessionId: options.sessionId,
          modelName: options.model,
        };

        const format = options.format as OutputFormat;
        if (!FORMATTERS[format]) {
          throw new Error(`Unknown format: '${format}'. Expected table, json, or csv.`);
        }

        const sessions = collectAndSort(adapter, dbPath, filters, options.limit);
        if (sessions.length === 0) {
          console.error('No sessions matched the filters.');
          return;
        }

        console.log(FORMATTERS[format](sessions));
      });
  }

  try {
    await program.parseAsync(argv);
    return 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    if (program.opts().verbose) {
      console.error(err);
    }
    if (message.startsWith('Unknown agent:') || message.includes('not found')) {
      return 2;
    }
    return 1;
  }
}

function isCliEntrypoint(): boolean {
  if (!process.argv[1]) {
    return false;
  }
  try {
    return fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isCliEntrypoint()) {
  main().then((code) => {
    process.exitCode = code;
  });
}
