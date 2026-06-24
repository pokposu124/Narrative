import { readLatest } from "@/lib/data";
import ThemeTable from "@/components/ThemeTable";
import type { ThemeScore } from "@/types";

export const revalidate = 600;

function formatTimestamp(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default async function HomePage() {
  const snapshot = await readLatest();
  const themes: ThemeScore[] = (snapshot?.themes ?? []).slice().sort((a, b) => b.totalScore - a.totalScore);
  const lastUpdated = snapshot?.timestamp ?? "";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-6">
        <div>
          <h1 className="text-base font-bold text-zinc-100 tracking-wider uppercase">
            미국 시장 내러티브 트래커
          </h1>
          <p className="text-zinc-500 text-xs mt-0.5">
            뉴스 · 거래량 · 가격 신호로 테마 모멘텀 순위
          </p>
        </div>
        <div className="text-[11px] text-zinc-600 font-mono">
          {lastUpdated ? (
            <>최근 업데이트: {formatTimestamp(lastUpdated)}</>
          ) : (
            <span className="text-yellow-600">데이터 없음 — POST /api/trigger 실행 필요</span>
          )}
        </div>
      </div>

      <div className="border border-zinc-800 px-4 py-2 mb-4 text-[11px] text-zinc-600 font-mono flex flex-wrap gap-x-6 gap-y-1">
        <span>점수 = <span className="text-zinc-400">0.40×뉴스 + 0.35×거래량 + 0.25×가격</span></span>
        <span>0–100 백분위 철도</span>
        <span className="text-green-600">≥70 인기</span>
        <span className="text-yellow-600">40–70 관심</span>
        <span className="text-zinc-600">&lt;40 평범</span>
      </div>

      {themes.length === 0 ? (
        <div className="border border-zinc-800 p-8 text-center text-zinc-600 font-mono">
          <p className="text-sm">스냅샷 데이터 없음</p>
          <p className="text-xs mt-2">데이터 수집을 위해 배치를 실행하세요:</p>
          <code className="block mt-2 text-green-700 text-xs">
            curl -X POST http://localhost:3000/api/trigger
          </code>
        </div>
      ) : (
        <ThemeTable themes={themes} />
      )}

      {themes.length > 0 && (
        <p className="text-zinc-700 text-[11px] mt-3 font-mono">
          {themes.length}개 테마 · 행 클릭하면 상세 정보
        </p>
      )}
    </div>
  );
}
