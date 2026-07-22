#!/usr/bin/env node
import { startServer } from './server/launcher.js';

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex >= 0 ? Number(args[portIndex + 1]) : undefined;
const shouldOpen = args.includes('--open');

startServer({ port, open: shouldOpen });
