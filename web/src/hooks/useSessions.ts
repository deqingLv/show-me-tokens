import { useCallback, useEffect, useState } from 'react';
import { fetchAgents, fetchSessions, fetchSummary } from '../api.js';
import { Filters, SessionSummary, SessionUsage } from '../types.js';

const EMPTY_FILTERS: Filters = {
  since: '',
  until: '',
  workspace: '',
  sessionId: '',
  model: '',
  limit: '',
};

export function useSessions() {
  const [agents, setAgents] = useState<string[]>([]);
  const [agent, setAgent] = useState<string>('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sessions, setSessions] = useState<SessionUsage[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents()
      .then((list) => {
        setAgents(list);
        if (list.length > 0 && !agent) {
          setAgent(list[0]);
        }
      })
      .catch((err) => setError(err.message));
  }, [agent]);

  const load = useCallback(async () => {
    if (!agent) return;
    setLoading(true);
    setError(null);
    try {
      const [sessionData, summaryData] = await Promise.all([
        fetchSessions(agent, filters),
        fetchSummary(agent, filters),
      ]);
      setSessions(sessionData);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSessions([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [agent, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const updateFilter = useCallback(
    (key: keyof Filters, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  return {
    agents,
    agent,
    setAgent,
    filters,
    updateFilter,
    resetFilters,
    sessions,
    summary,
    loading,
    error,
    refresh: load,
  };
}
