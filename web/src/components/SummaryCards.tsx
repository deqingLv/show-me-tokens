import { SessionSummary } from '../types.js';

interface SummaryCardsProps {
  summary: SessionSummary | null;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--border)',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        borderLeft: `4px solid ${color}`,
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </span>
      <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {value}
      </span>
    </div>
  );
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  if (!summary) {
    return null;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 16,
      }}
    >
      <Card label="Sessions" value={fmt(summary.totalSessions)} color="var(--text-secondary)" />
      <Card label="Input" value={fmt(summary.inputTokens)} color="var(--input-bar)" />
      <Card label="Output" value={fmt(summary.outputTokens)} color="var(--output-bar)" />
      <Card label="Cache Read" value={fmt(summary.cacheReadInputTokens)} color="var(--cache-bar)" />
      <Card label="Total" value={fmt(summary.totalTokens)} color="var(--accent)" />
    </div>
  );
}
