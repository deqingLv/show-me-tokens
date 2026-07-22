import { AgentAdapter } from './base.js';
import { QoderAdapter } from './qoder.js';
import { QoderWorkAdapter } from './qoderwork.js';

export type AdapterConstructor = new () => AgentAdapter;

const ADAPTERS: Record<string, AdapterConstructor> = {
  qoder: QoderAdapter,
  qoderwork: QoderWorkAdapter,
};

export function getAdapter(name: string): AdapterConstructor {
  const cls = ADAPTERS[name];
  if (!cls) {
    throw new Error(
      `Unknown agent: '${name}'. Supported agents: ${listAdapterNames().join(', ')}`
    );
  }
  return cls;
}

export function listAdapterNames(): string[] {
  return Object.keys(ADAPTERS).sort();
}
