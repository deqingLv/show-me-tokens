import { exportUrl } from '../api.js';
import { Filters } from '../types.js';

interface ExportButtonsProps {
  agent: string;
  filters: Filters;
}

const BUTTON_STYLE: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text-primary)',
  fontSize: 14,
  fontWeight: 500,
  textDecoration: 'none',
  display: 'inline-block',
};

export function ExportButtons({ agent, filters }: ExportButtonsProps) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <a
        href={exportUrl(agent, 'json', filters)}
        download
        style={BUTTON_STYLE}
      >
        Export JSON
      </a>
      <a
        href={exportUrl(agent, 'csv', filters)}
        download
        style={BUTTON_STYLE}
      >
        Export CSV
      </a>
    </div>
  );
}
