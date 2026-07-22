import { SessionUsage, SessionSummary, Filters } from './types.js';

const API_BASE = '';

export async function fetchAgents(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/agents`);
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data = (await res.json()) as { agents: string[] };
  return data.agents;
}

export async function fetchSessions(
  agent: string,
  filters: Filters
): Promise<SessionUsage[]> {
  const params = new URLSearchParams({ agent });
  if (filters.since) params.set('since', filters.since);
  if (filters.until) params.set('until', filters.until);
  if (filters.workspace) params.set('workspace', filters.workspace);
  if (filters.sessionId) params.set('sessionId', filters.sessionId);
  if (filters.model) params.set('model', filters.model);
  if (filters.limit) params.set('limit', filters.limit);

  const res = await fetch(`${API_BASE}/api/sessions?${params}`);
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data = (await res.json()) as { sessions: SessionUsage[] };
  return data.sessions;
}

export async function fetchSummary(
  agent: string,
  filters: Filters
): Promise<SessionSummary> {
  const params = new URLSearchParams({ agent });
  if (filters.since) params.set('since', filters.since);
  if (filters.until) params.set('until', filters.until);
  if (filters.workspace) params.set('workspace', filters.workspace);
  if (filters.sessionId) params.set('sessionId', filters.sessionId);
  if (filters.model) params.set('model', filters.model);

  const res = await fetch(`${API_BASE}/api/summary?${params}`);
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data = (await res.json()) as { summary: SessionSummary };
  return data.summary;
}

export function exportUrl(
  agent: string,
  format: 'json' | 'csv',
  filters: Filters
): string {
  const params = new URLSearchParams({ agent, format });
  if (filters.since) params.set('since', filters.since);
  if (filters.until) params.set('until', filters.until);
  if (filters.workspace) params.set('workspace', filters.workspace);
  if (filters.sessionId) params.set('sessionId', filters.sessionId);
  if (filters.model) params.set('model', filters.model);
  return `${API_BASE}/api/export?${params}`;
}
