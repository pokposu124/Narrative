import { readLatest } from "@/lib/data";
import ThemeTable from "@/components/ThemeTable";
import type { ThemeScore } from "@/types";

export const revalidate = 600;

function formatTimestamp(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default async function HomePage() {
  const snapshot = await readLatest();
  // Sort defensively in case snapshot was written by an older batch without sorting
  const themes: ThemeScore[] = (snapshot?.themes ?? []).slice().sort((a, b) => b.totalScore - a.totalScore);
  const lastUpdated = snapshot?.timestamp ?? "";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-6">
        <div>
          <h1 className="text-base font-bold text-zinc-100 tracking-wider uppercase">
            US MARKET NARRATIVE TRACKER
          </h1>
          <p className="text-zinc-500 text-xs mt-0.5">
            Theme momentum ranked by news · volume · price signals
          </p>
        </div>
        <div className="text-[11px] text-zinc-600 font-mono">
          {lastUpdated ? (
            <>LAST UPDATE: {formatTimestamp(lastUpdated)}</>
          ) : (
            <span className="text-yellow-600">NO DATA — run POST /api/trigger to seed</span>
          )}
        </div>
      </div>

      <div className="border border-zinc-800 px-4 py-2 mb-4 text-[11px] text-zinc-600 font-mono flex flex-wrap gap-x-6 gap-y-1">
        <span>SCORE = <span className="text-zinc-400">0.40×NEWS + 0.35×VOL + 0.25×PRICE</span></span>
        <span>0–100 PERCENTILE SCALE</span>
        <span className="text-green-600">≥70 HOT</span>
        <span className="text-yellow-600">40–70 ACTIVE</span>
        <span className="text-zinc-600">&lt;40 QUIET</span>
      </div>

      {themes.length === 0 ? (
        <div className="border border-zinc-800 p-8 text-center text-zinc-600 font-mono">
          <p className="text-sm">NO SNAPSHOT DATA AVAILABLE</p>
          <p className="text-xs mt-2">Run the batch to populate data:</p>
          <code className="block mt-2 text-green-700 text-xs">
            curl -X POST http://localhost:3000/api/trigger
          </code>
        </div>
      ) : (
        <ThemeTable themes={themes} />
      )}

      {themes.length > 0 && (
        <p className="text-zinc-700 text-[11px] mt-3 font-mono">
          {themes.length} THEMES · CLICK ROW FOR DETAIL
        </p>
      )}
    </div>
  );
}
