import { notFound } from "next/navigation";
import Link from "next/link";
import { readLatest, readScoreHistory } from "@/lib/data";
import ScoreChart from "@/components/ScoreChart";
import type { ThemeScore, TickerData, Headline } from "@/types";

export const revalidate = 600;

function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function sign(n: number) {
  return n >= 0 ? "+" : "";
}

function ChangeCell({ v }: { v: number }) {
  const color = v >= 0 ? "text-green-400" : "text-red-400";
  return (
    <span className={color}>
      {sign(v)}{fmt(v, 2)}%
    </span>
  );
}

function RelVolCell({ v }: { v: number }) {
  const color = v >= 2 ? "text-green-400" : v >= 1.3 ? "text-yellow-400" : "text-zinc-400";
  return <span className={color}>{fmt(v, 2)}x</span>;
}

function HeadlineList({ headlines }: { headlines: Headline[] }) {
  if (headlines.length === 0) {
    return <p className="text-zinc-600 text-xs">No recent headlines available.</p>;
  }
  return (
    <ul className="space-y-2">
      {headlines.slice(0, 15).map((h, i) => (
        <li key={i} className="border-b border-zinc-900 pb-2">
          <a
            href={h.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-200 hover:text-green-400 transition-colors text-xs leading-relaxed"
          >
            {h.headline}
          </a>
          <div className="text-zinc-600 text-[10px] mt-0.5">
            <span className="text-zinc-500">[{h.ticker}]</span>{" "}
            {h.source} ·{" "}
            {new Date(h.datetime * 1000).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function ThemeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snapshot = await readLatest();
  if (!snapshot) notFound();

  const theme: ThemeScore | undefined = snapshot.themes.find((t) => t.id === id);
  if (!theme) notFound();

  const history = await readScoreHistory();
  const chartData = history
    .map((h) => ({ timestamp: h.timestamp, score: h.scores[id] ?? 0 }))
    .filter((h) => h.score > 0);

  const rank = snapshot.themes.findIndex((t) => t.id === id) + 1;

  return (
    <div className="space-y-6">
      <div className="text-xs text-zinc-600 font-mono">
        <Link href="/" className="hover:text-zinc-400 transition-colors">
          ← BACK TO RANKING
        </Link>
      </div>

      <div className="border border-zinc-800 p-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <div>
            <h1 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              #{rank} · {theme.name}
            </h1>
            <p className="text-zinc-500 text-xs mt-1 max-w-xl">{theme.description}</p>
          </div>
          <div className="text-right font-mono shrink-0">
            <div className="text-2xl text-zinc-100">{fmt(theme.totalScore)}</div>
            <div className="text-[10px] text-zinc-600">COMPOSITE SCORE</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 border-t border-zinc-800 pt-4">
          {[
            { label: "NEWS (40%)", value: theme.newsScore },
            { label: "VOLUME (35%)", value: theme.volumeScore },
            { label: "PRICE (25%)", value: theme.priceScore },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-[10px] text-zinc-600 mb-1">{label}</div>
              <div className="text-lg text-zinc-100">{fmt(value)}</div>
              <div className="w-full h-1 bg-zinc-800 mt-1">
                <div
                  className="h-full bg-green-600"
                  style={{ width: `${Math.min(100, value)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {theme.scoreDelta !== null && (
          <p className="text-[11px] mt-3 font-mono text-zinc-500">
            PREV SCORE: {fmt(theme.prevTotalScore ?? 0)} ·{" "}
            <span
              className={
                theme.deltaDirection === "▲"
                  ? "text-green-400"
                  : theme.deltaDirection === "▼"
                  ? "text-red-400"
                  : "text-zinc-500"
              }
            >
              {theme.deltaDirection} {Math.abs(theme.scoreDelta).toFixed(1)} pts
            </span>
          </p>
        )}
      </div>

      <div>
        <h2 className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2 font-mono">
          SCORE HISTORY
        </h2>
        <ScoreChart history={chartData} themeId={id} />
      </div>

      <div>
        <h2 className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2 font-mono">
          CONSTITUENTS
        </h2>
        <div className="overflow-x-auto border border-zinc-800">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-zinc-700 text-zinc-600 uppercase text-[10px] tracking-wider">
                <th className="px-3 py-2 text-left">TICKER</th>
                <th className="px-3 py-2 text-right">PRICE</th>
                <th className="px-3 py-2 text-right">1D</th>
                <th className="px-3 py-2 text-right">5D</th>
                <th className="px-3 py-2 text-right">REL VOL</th>
                <th className="px-3 py-2 text-right">NEWS 48H</th>
              </tr>
            </thead>
            <tbody>
              {theme.tickerData.map((t: TickerData) => (
                <tr key={t.ticker} className="border-b border-zinc-900 hover:bg-zinc-900">
                  <td className="px-3 py-2 text-zinc-100 font-bold">{t.ticker}</td>
                  <td className="px-3 py-2 text-right text-zinc-200">${fmt(t.price)}</td>
                  <td className="px-3 py-2 text-right"><ChangeCell v={t.change1d} /></td>
                  <td className="px-3 py-2 text-right"><ChangeCell v={t.change5d} /></td>
                  <td className="px-3 py-2 text-right"><RelVolCell v={t.relativeVolume} /></td>
                  <td className="px-3 py-2 text-right text-zinc-400">{t.newsCount48h}</td>
                </tr>
              ))}
              {theme.tickerData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-zinc-600">
                    No ticker data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2 font-mono">
          RECENT HEADLINES
        </h2>
        <div className="border border-zinc-800 p-4">
          <HeadlineList headlines={theme.headlines} />
        </div>
      </div>
    </div>
  );
}
