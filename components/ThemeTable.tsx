"use client";

import Link from "next/link";
import type { ThemeScore } from "@/types";

interface Props {
  themes: ThemeScore[];
}

function ScoreBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color =
    pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-zinc-600";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-zinc-100 w-10 text-right">{value.toFixed(1)}</span>
      <span className="hidden sm:block w-16 h-1.5 bg-zinc-800 rounded-none overflow-hidden">
        <span className={`block h-full ${color}`} style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

function Delta({ score }: { score: ThemeScore }) {
  if (score.deltaDirection === "▲") {
    return (
      <span className="text-green-400 font-mono text-xs">
        ▲ {score.scoreDelta !== null ? Math.abs(score.scoreDelta).toFixed(1) : "—"}
      </span>
    );
  }
  if (score.deltaDirection === "▼") {
    return (
      <span className="text-red-400 font-mono text-xs">
        ▼ {score.scoreDelta !== null ? Math.abs(score.scoreDelta).toFixed(1) : "—"}
      </span>
    );
  }
  return <span className="text-zinc-600 font-mono text-xs">—</span>;
}

export default function ThemeTable({ themes }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="border-b border-zinc-700 text-zinc-500 uppercase tracking-wider">
            <th className="px-3 py-2 text-right w-8">#</th>
            <th className="px-3 py-2 text-left">THEME</th>
            <th className="px-3 py-2 text-right">SCORE</th>
            <th className="px-3 py-2 text-right">NEWS</th>
            <th className="px-3 py-2 text-right">VOL</th>
            <th className="px-3 py-2 text-right">PRICE</th>
            <th className="px-3 py-2 text-right">CHG</th>
            <th className="px-3 py-2 text-left hidden md:table-cell">TICKERS</th>
          </tr>
        </thead>
        <tbody>
          {themes.map((t, i) => (
            <tr
              key={t.id}
              className="border-b border-zinc-800 hover:bg-zinc-900 transition-colors cursor-pointer group"
            >
              <td className="px-3 py-2.5 text-right text-zinc-500">{i + 1}</td>
              <td className="px-3 py-2.5">
                <Link
                  href={`/theme/${t.id}`}
                  className="text-zinc-100 hover:text-green-400 transition-colors"
                >
                  {t.name}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-right">
                <ScoreBar value={t.totalScore} />
              </td>
              <td className="px-3 py-2.5 text-right text-zinc-300">{t.newsScore.toFixed(1)}</td>
              <td className="px-3 py-2.5 text-right text-zinc-300">{t.volumeScore.toFixed(1)}</td>
              <td className="px-3 py-2.5 text-right text-zinc-300">{t.priceScore.toFixed(1)}</td>
              <td className="px-3 py-2.5 text-right"><Delta score={t} /></td>
              <td className="px-3 py-2.5 hidden md:table-cell">
                <span className="text-zinc-500">
                  {t.tickers.slice(0, 4).join(" · ")}
                  {t.tickers.length > 4 && (
                    <span className="text-zinc-700"> +{t.tickers.length - 4}</span>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
