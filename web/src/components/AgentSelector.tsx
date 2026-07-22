interface AgentSelectorProps {
  agents: string[];
  value: string;
  onChange: (agent: string) => void;
}

export function AgentSelector({ agents, value, onChange }: AgentSelectorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <label
        htmlFor="agent"
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        Agent
      </label>
      <select
        id="agent"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '8px 12px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          color: 'var(--text-primary)',
          fontSize: 15,
          minWidth: 160,
        }}
      >
        {agents.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </div>
  );
}
