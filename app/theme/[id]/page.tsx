import { notFound } from "next/navigation";
import Link from "next/link";
import { readLatest, readScoreHistory } from "@/lib/data";
import ScoreChart from "@/components/ScoreChart";
import TickerTable from "@/components/TickerTable";
import HeadlineLoader from "@/components/HeadlineLoader";
import type { ThemeScore, KpiValue } from "@/types";

export const revalidate = 600;

function fmt(n: number, d = 1) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function formatKpiValue(kpi: KpiValue): string {
  const v = kpi.value;
  if (v === null) return "N/A";
  switch (kpi.format) {
    case "financial_pct":
      return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
    case "change_pct":
      return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
    case "price_usd":
      if (v >= 1_000) return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
      return `$${v.toFixed(2)}`;
    case "price_rate":
      return `${v.toFixed(2)}%`;
    case "price_number":
      return v.toFixed(4);
    case "price_billions":
      return `$${(v / 1e9).toFixed(1)}B`;
    default:
      return v.toFixed(2);
  }
}

function kpiColor(kpi: KpiValue): string {
  const v = kpi.value;
  if (v === null) return "text-zinc-600";
  if (kpi.format === "financial_pct" || kpi.format === "change_pct") {
    const n = kpi.format === "financial_pct" ? v * 100 : v;
    return n >= 0 ? "text-green-400" : "text-red-400";
  }
  return "text-zinc-100";
}

function KpiCard({ kpi }: { kpi: KpiValue }) {
  return (
    <div className="border border-zinc-800 p-3">
      <div className="text-[10px] text-zinc-600 uppercase tracking-wider font-mono mb-1 leading-tight">
        {kpi.label}
      </div>
      <div className={`text-lg font-mono ${kpiColor(kpi)}`}>
        {formatKpiValue(kpi)}
      </div>
      <div className="text-[10px] text-zinc-700 mt-0.5 font-mono">
        {kpi.ticker}{kpi.period ? ` · ${kpi.period}` : ""}
      </div>
    </div>
  );
}

function GenericKpiCard({
  label, value, sub, color,
}: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="border border-zinc-800 p-3">
      <div className="text-[10px] text-zinc-600 uppercase tracking-wider font-mono mb-1">{label}</div>
      <div className={`text-lg font-mono ${color ?? "text-zinc-100"}`}>{value}</div>
      {sub && <div className="text-[10px] text-zinc-600 mt-0.5">{sub}</div>}
    </div>
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

  const td = theme.tickerData;
  const avg1d = td.length ? td.reduce((s, t) => s + t.change1d, 0) / td.length : 0;
  const avg5d = td.length ? td.reduce((s, t) => s + t.change5d, 0) / td.length : 0;
  const totalNews = td.reduce((s, t) => s + t.newsCount48h, 0);
  const avgRelVol = td.length ? td.reduce((s, t) => s + t.relativeVolume, 0) / td.length : 0;
  const totalMktCap = td.reduce((s, t) => s + (t.marketCap ?? 0), 0);

  function fmtMktCap(v: number) {
    if (!v) return "—";
    if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
    return `$${(v / 1e6).toFixed(0)}M`;
  }

  const rank =
    [...snapshot.themes]
      .sort((a, b) => b.totalScore - a.totalScore)
      .findIndex((t) => t.id === id) + 1;

  return (
    <div className="space-y-6">
      <div className="text-xs text-zinc-600 font-mono">
        <Link href="/" className="hover:text-zinc-400 transition-colors">← BACK TO RANKING</Link>
      </div>

      {/* Header */}
      <div className="border border-zinc-800 p-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <div>
            <h1 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              #{rank} · {theme.name}
            </h1>
            <p className="text-zinc-500 text-xs mt-1 max-w-xl">{theme.description}</p>
          </div>
          <div className="text-right font-mono shrink-0">
            <div className="text-3xl text-zinc-100">{fmt(theme.totalScore)}</div>
            <div className="text-[10px] text-zinc-600">COMPOSITE SCORE</div>
            {theme.scoreDelta !== null && (
              <div className={`text-xs mt-0.5 ${
                theme.deltaDirection === "▲" ? "text-green-400" :
                theme.deltaDirection === "▼" ? "text-red-400" : "text-zinc-600"
              }`}>
                {theme.deltaDirection} {Math.abs(theme.scoreDelta!).toFixed(1)} pts
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 border-t border-zinc-800 pt-4">
          {[
            { label: "NEWS (40%)",   value: theme.newsScore   },
            { label: "VOLUME (35%)", value: theme.volumeScore },
            { label: "PRICE (25%)",  value: theme.priceScore  },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-[10px] text-zinc-600 mb-1">{label}</div>
              <div className="text-lg text-zinc-100 font-mono">{fmt(value)}</div>
              <div className="w-full h-1 bg-zinc-800 mt-1">
                <div className="h-full bg-green-600" style={{ width: `${Math.min(100, value)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Theme KPIs */}
      <div>
        <h2 className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2 font-mono">
          THEME KPIs
        </h2>
        {theme.customKpis?.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {theme.customKpis.map((kpi, i) => (
              <KpiCard key={i} kpi={kpi} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <GenericKpiCard label="AVG 1D RETURN" value={`${avg1d >= 0 ? "+" : ""}${fmt(avg1d)}%`}
              sub="equal-weighted" color={avg1d >= 0 ? "text-green-400" : "text-red-400"} />
            <GenericKpiCard label="AVG 5D RETURN" value={`${avg5d >= 0 ? "+" : ""}${fmt(avg5d)}%`}
              sub="equal-weighted" color={avg5d >= 0 ? "text-green-400" : "text-red-400"} />
            <GenericKpiCard label="AVG REL VOL" value={`${fmt(avgRelVol, 2)}x`} sub="vs 20d avg"
              color={avgRelVol >= 1.5 ? "text-green-400" : "text-zinc-100"} />
            <GenericKpiCard label="NEWS 48H" value={totalNews.toString()} sub={`${td.length} tickers`}
              color={totalNews > 50 ? "text-green-400" : "text-zinc-100"} />
            <GenericKpiCard label="THEME MKT CAP" value={fmtMktCap(totalMktCap)} sub="sum" />
          </div>
        )}
      </div>

      {/* Score history */}
      <div>
        <h2 className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2 font-mono">SCORE HISTORY</h2>
        <ScoreChart history={chartData} themeId={id} />
      </div>

      {/* Sortable ticker table */}
      <div>
        <h2 className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2 font-mono">
          CONSTITUENTS
          <span className="ml-2 text-zinc-700 normal-case">— click column header to sort</span>
        </h2>
        <TickerTable tickers={theme.tickerData} />
      </div>

      {/* Headlines */}
      <div>
        <h2 className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2 font-mono">RECENT HEADLINES</h2>
        <div className="border border-zinc-800 p-4">
          <HeadlineLoader themeId={id} initial={theme.headlines} />
        </div>
      </div>
    </div>
  );
}
