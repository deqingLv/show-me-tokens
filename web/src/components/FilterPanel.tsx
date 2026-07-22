import { Filters } from '../types.js';

interface FilterPanelProps {
  filters: Filters;
  onChange: (key: keyof Filters, value: string) => void;
  onReset: () => void;
}

const FIELD_STYLE: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text-primary)',
  fontSize: 14,
  width: '100%',
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 4,
};

export function FilterPanel({ filters, onChange, onReset }: FilterPanelProps) {
  return (
    <div
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        padding: 20,
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={LABEL_STYLE}>Workspace path</label>
          <input
            type="text"
            placeholder="/path/to/project"
            value={filters.workspace}
            onChange={(e) => onChange('workspace', e.target.value)}
            style={FIELD_STYLE}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={LABEL_STYLE}>Session ID</label>
          <input
            type="text"
            placeholder="abc-123"
            value={filters.sessionId}
            onChange={(e) => onChange('sessionId', e.target.value)}
            style={FIELD_STYLE}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={LABEL_STYLE}>Model</label>
          <input
            type="text"
            placeholder="glm-5"
            value={filters.model}
            onChange={(e) => onChange('model', e.target.value)}
            style={FIELD_STYLE}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={LABEL_STYLE}>Since</label>
          <input
            type="date"
            value={filters.since}
            onChange={(e) => onChange('since', e.target.value)}
            style={FIELD_STYLE}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={LABEL_STYLE}>Until</label>
          <input
            type="date"
            value={filters.until}
            onChange={(e) => onChange('until', e.target.value)}
            style={FIELD_STYLE}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={LABEL_STYLE}>Limit</label>
          <input
            type="number"
            min={0}
            placeholder="20"
            value={filters.limit}
            onChange={(e) => onChange('limit', e.target.value)}
            style={FIELD_STYLE}
          />
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onReset}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text-secondary)',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
