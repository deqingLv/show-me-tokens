import { AgentSelector } from './components/AgentSelector.js';
import { FilterPanel } from './components/FilterPanel.js';
import { SummaryCards } from './components/SummaryCards.js';
import { TokenChart } from './components/TokenChart.js';
import { SessionsTable } from './components/SessionsTable.js';
import { ExportButtons } from './components/ExportButtons.js';
import { useSessions } from './hooks/useSessions.js';

export default function App() {
  const {
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
  } = useSessions();

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          background: 'var(--card)',
          borderBottom: '1px solid var(--border)',
          padding: '20px 32px',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
              }}
            >
              show-me-tokens
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
              Local AI IDE session token usage
            </p>
          </div>
          <AgentSelector agents={agents} value={agent} onChange={setAgent} />
        </div>
      </header>

      <main style={{ flex: 1, padding: '24px 32px' }}>
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <FilterPanel
            filters={filters}
            onChange={updateFilter}
            onReset={resetFilters}
          />

          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius)',
                padding: 16,
                color: 'var(--danger)',
              }}
            >
              {error}
            </div>
          )}

          <SummaryCards summary={summary} />

          <TokenChart sessions={sessions} />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {loading
                ? 'Loading sessions...'
                : `${sessions.length} session${sessions.length === 1 ? '' : 's'}`}
            </div>
            <ExportButtons agent={agent} filters={filters} />
          </div>

          <SessionsTable sessions={sessions} />
        </div>
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '16px 32px',
          fontSize: 12,
          color: 'var(--text-secondary)',
          textAlign: 'center',
        }}
      >
        Reads local SQLite files only. No remote connections.
      </footer>
    </div>
  );
}
