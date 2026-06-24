"use client";

interface HistoryPoint {
  timestamp: string;
  score: number;
}

interface Props {
  history: HistoryPoint[];
  themeId: string;
}

export default function ScoreChart({ history }: Props) {
  if (history.length < 2) {
    return (
      <div className="border border-zinc-800 p-4 text-zinc-600 font-mono text-xs text-center">
        NOT ENOUGH HISTORY DATA (need ≥2 snapshots)
      </div>
    );
  }

  const W = 600;
  const H = 120;
  const PAD = { top: 12, right: 20, bottom: 28, left: 36 };

  const minScore = Math.max(0, Math.min(...history.map((h) => h.score)) - 5);
  const maxScore = Math.min(100, Math.max(...history.map((h) => h.score)) + 5);
  const scoreRange = maxScore - minScore || 1;

  const minTs = new Date(history[0].timestamp).getTime();
  const maxTs = new Date(history[history.length - 1].timestamp).getTime();
  const tsRange = maxTs - minTs || 1;

  function toX(ts: string) {
    const t = new Date(ts).getTime();
    return PAD.left + ((t - minTs) / tsRange) * (W - PAD.left - PAD.right);
  }

  function toY(score: number) {
    return PAD.top + (1 - (score - minScore) / scoreRange) * (H - PAD.top - PAD.bottom);
  }

  const points = history.map((h) => `${toX(h.timestamp)},${toY(h.score)}`).join(" ");

  const yTicks = [minScore, (minScore + maxScore) / 2, maxScore].map(Math.round);
  const xTickIndices =
    history.length <= 8
      ? history.map((_, i) => i)
      : [0, Math.floor(history.length / 2), history.length - 1];

  function fmtDate(ts: string) {
    const d = new Date(ts);
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d
      .getDate()
      .toString()
      .padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}h`;
  }

  return (
    <div className="border border-zinc-800 bg-zinc-950 p-2 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-full" style={{ minWidth: "300px" }}>
        {yTicks.map((v) => (
          <line
            key={v}
            x1={PAD.left}
            y1={toY(v)}
            x2={W - PAD.right}
            y2={toY(v)}
            stroke="#27272a"
            strokeWidth="1"
          />
        ))}
        {yTicks.map((v) => (
          <text
            key={v}
            x={PAD.left - 4}
            y={toY(v) + 4}
            textAnchor="end"
            fill="#52525b"
            fontSize="9"
            fontFamily="monospace"
          >
            {v}
          </text>
        ))}
        {xTickIndices.map((idx) => (
          <text
            key={idx}
            x={toX(history[idx].timestamp)}
            y={H - 4}
            textAnchor="middle"
            fill="#52525b"
            fontSize="9"
            fontFamily="monospace"
          >
            {fmtDate(history[idx].timestamp)}
          </text>
        ))}
        <polyline
          points={points}
          fill="none"
          stroke="#22c55e"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {history.map((h, i) => (
          <circle
            key={i}
            cx={toX(h.timestamp)}
            cy={toY(h.score)}
            r="2.5"
            fill="#22c55e"
          />
        ))}
      </svg>
    </div>
  );
}
