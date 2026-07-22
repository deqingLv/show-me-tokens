import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { SessionUsage } from '../types.js';

interface TokenChartProps {
  sessions: SessionUsage[];
}

export function TokenChart({ sessions }: TokenChartProps) {
  const data = sessions.slice(0, 30).map((s) => {
    const input = s.tokens.inputTokens;
    const cache = Math.min(s.tokens.cacheReadInputTokens ?? 0, input);
    return {
      name: s.title || s.sessionId,
      uncachedInput: Math.max(input - cache, 0),
      cache,
      output: s.tokens.outputTokens,
    };
  });

  if (data.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--border)',
        padding: 20,
        height: 320,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 12,
        }}
      >
        Token breakdown (cache is shown inside input, top {data.length})
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
          <Tooltip
            contentStyle={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}
          />
          <Legend />
          <Bar
            dataKey="uncachedInput"
            name="Input (uncached)"
            stackId="a"
            fill="var(--input-bar)"
          />
          <Bar
            dataKey="cache"
            name="Cache read (inside input)"
            stackId="a"
            fill="var(--cache-bar)"
          />
          <Bar dataKey="output" name="Output" stackId="a" fill="var(--output-bar)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
