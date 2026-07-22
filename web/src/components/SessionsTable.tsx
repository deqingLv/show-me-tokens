import { SessionUsage } from '../types.js';

interface SessionsTableProps {
  sessions: SessionUsage[];
}

function fmt(n: number | null): string {
  if (n === null || n === undefined) return '-';
  return n.toLocaleString('en-US');
}

function workspaceName(value: string | null): string {
  if (!value) return 'default';
  const trimmed = value.replace(/\/$/, '');
  const lastSlash = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  const name = lastSlash >= 0 ? trimmed.slice(lastSlash + 1) : trimmed;
  return name || 'default';
}

function fmtPercent(numerator: number | null, denominator: number): string {
  if (!numerator || denominator <= 0) return '-';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function fmtUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  if (value > 0 && value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

export function SessionsTable({ sessions }: SessionsTableProps) {
  if (sessions.length === 0) {
    return (
      <div
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          border: '1px solid var(--border)',
          padding: 40,
          textAlign: 'center',
          color: 'var(--text-secondary)',
        }}
      >
        No sessions matched the filters.
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid var(--border)' }}>
              {[
                { label: 'Title' },
                { label: 'Workspace' },
                { label: 'Model' },
                { label: 'Input' },
                { label: 'Cache' },
                { label: 'Cache/Input' },
                { label: 'Output' },
                { label: 'Output/Input' },
                { label: 'Total' },
                {
                  label: 'HF Cost',
                  help:
                    'Estimated USD cost from Hugging Face Inference Providers prices. Formula: input_tokens / 1M × HF input price + output_tokens / 1M × HF output price. Cache read tokens are included in input and are not added again. Unknown models show -. Pricing: https://huggingface.co/inference/models',
                },
              ].map((h) => (
                <th
                  key={h.label}
                  title={h.help}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    cursor: h.help ? 'help' : 'default',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h.label}
                  {h.help ? (
                    <a
                      href="https://huggingface.co/inference/models"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Open Hugging Face Inference Providers pricing"
                      onClick={(event) => event.stopPropagation()}
                      style={{
                        marginLeft: 4,
                        color: 'var(--accent)',
                        fontSize: 11,
                        textTransform: 'none',
                        textDecoration: 'none',
                      }}
                    >
                      ⓘ
                    </a>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr
                key={s.sessionId}
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <td style={{ padding: '12px 16px', maxWidth: 260 }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {s.title || s.sessionId}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      marginTop: 2,
                    }}
                  >
                    {s.sessionId}
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>{workspaceName(s.workspacePath)}</td>
                <td style={{ padding: '12px 16px' }}>{s.modelName || '-'}</td>
                <td style={{ padding: '12px 16px' }}>{fmt(s.tokens.inputTokens)}</td>
                <td style={{ padding: '12px 16px' }}>{fmt(s.tokens.cacheReadInputTokens)}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--cache-bar)' }}>
                  {fmtPercent(s.tokens.cacheReadInputTokens, s.tokens.inputTokens)}
                </td>
                <td style={{ padding: '12px 16px' }}>{fmt(s.tokens.outputTokens)}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--output-bar)' }}>
                  {fmtPercent(s.tokens.outputTokens, s.tokens.inputTokens)}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{fmt(s.tokens.totalTokens)}</td>
                <td
                  title={
                    s.pricing
                      ? `${s.pricing.modelId} · ${s.pricing.provider} · input $${s.pricing.inputUsdPerMillion}/1M · output $${s.pricing.outputUsdPerMillion}/1M`
                      : 'No Hugging Face price matched for this model'
                  }
                  style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--accent)' }}
                >
                  {fmtUsd(s.pricing?.costUsd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
