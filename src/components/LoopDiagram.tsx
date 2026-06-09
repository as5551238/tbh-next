interface Props {
  goals?: number;
  tasks?: number;
  actionItems?: number;
  reviews?: number;
  completionRate?: number;
}

const NODES = [
  { key: 'goals', emoji: '🎯', label: '目标', color: '#7b6cf0' },
  { key: 'tasks', emoji: '✅', label: '任务', color: '#00d4aa' },
  { key: 'actionItems', emoji: '⚡', label: '行动', color: '#4facfe' },
  { key: 'reviews', emoji: '🔄', label: '复盘', color: '#f5a623' },
] as const;

export default function LoopDiagram({ goals = 0, tasks = 0, actionItems = 0, reviews = 0, completionRate = 0 }: Props) {
  const counts: Record<string, number> = { goals, tasks, actionItems, reviews };
  const cx = 200;
  const cy = 200;
  const r = 130;

  const positions = NODES.map((_, i) => {
    const angle = (-90 + i * 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  const pct = Math.min(100, Math.max(0, completionRate));
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <svg viewBox="0 0 400 400" className="mx-auto w-full max-w-sm">
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#7b6cf0" opacity="0.6" />
          </marker>
        </defs>

        {/* Connecting arcs */}
        {positions.map((pos, i) => {
          const next = positions[(i + 1) % 4];
          const mx = (pos.x + next.x) / 2;
          const my = (pos.y + next.y) / 2 - 15;
          return (
            <path
              key={`arc-${i}`}
              d={`M${pos.x},${pos.y} Q${mx},${my} ${next.x},${next.y}`}
              fill="none"
              stroke="#7b6cf0"
              strokeWidth="1.5"
              strokeDasharray="6 3"
              markerEnd="url(#arrowhead)"
              opacity="0.4"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="2s" repeatCount="indefinite" />
            </path>
          );
        })}

        {/* Center ring chart */}
        <circle cx={cx} cy={cy} r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx={cx}
          cy={cy}
          r="40"
          fill="none"
          stroke="#7b6cf0"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          className="transition-all duration-700"
        />
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#7b6cf0" fontSize="18" fontWeight="bold">{pct}%</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">完成率</text>

        {/* Nodes */}
        {NODES.map((node, i) => {
          const pos = positions[i];
          return (
            <g key={node.key} transform={`translate(${pos.x},${pos.y})`}>
              <circle r="32" fill={`${node.color}15`} stroke={node.color} strokeWidth="1.5" />
              <text textAnchor="middle" y="-6" fontSize="18">{node.emoji}</text>
              <text textAnchor="middle" y="10" fill="rgba(255,255,255,0.7)" fontSize="9">{node.label}</text>
              <text textAnchor="middle" y="23" fill={node.color} fontSize="11" fontWeight="bold">{counts[node.key]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
