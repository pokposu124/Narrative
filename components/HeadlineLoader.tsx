"use client";

import { useState, useEffect } from "react";
import type { Headline } from "@/types";

interface MergedHeadline {
  tickers: string[];
  headline: string;
  source: string;
  url: string;
  datetime: number;
}

function mergeHeadlines(headlines: Headline[]): MergedHeadline[] {
  const map = new Map<string, MergedHeadline>();
  for (const h of headlines) {
    const key = h.url || h.headline;
    const existing = map.get(key);
    if (existing) {
      if (!existing.tickers.includes(h.ticker)) existing.tickers.push(h.ticker);
    } else {
      map.set(key, { tickers: [h.ticker], headline: h.headline, source: h.source, url: h.url, datetime: h.datetime });
    }
  }
  return [...map.values()].sort((a, b) => b.datetime - a.datetime);
}

export default function HeadlineLoader({
  themeId,
  initial,
}: {
  themeId: string;
  initial: Headline[];
}) {
  const [headlines, setHeadlines] = useState<Headline[]>(initial);
  const [loading, setLoading] = useState(initial.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [activeTicker, setActiveTicker] = useState<string | null>(null);

  useEffect(() => {
    if (initial.length > 0) return;
    fetch(`/api/headlines/${themeId}`)
      .then((r) => r.json())
      .then((data: { headlines?: Headline[] }) => {
        setHeadlines(data.headlines ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("헤드라인 로딩 실패");
        setLoading(false);
      });
  }, [themeId, initial.length]);

  if (loading)
    return <p className="text-zinc-600 text-xs font-mono animate-pulse">헤드라인 로딩 중...</p>;
  if (error)
    return <p className="text-red-600 text-xs font-mono">{error}</p>;

  const merged = mergeHeadlines(headlines);
  if (merged.length === 0)
    return <p className="text-zinc-600 text-xs">최근 헤드라인이 없습니다.</p>;

  const allTickers = Array.from(new Set(merged.flatMap((h) => h.tickers))).sort();
  const filtered = activeTicker ? merged.filter((h) => h.tickers.includes(activeTicker)) : merged;

  return (
    <div>
      {/* Ticker filter */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button
          onClick={() => setActiveTicker(null)}
          className={`text-[10px] font-mono px-2 py-0.5 border transition-colors ${
            activeTicker === null
              ? "border-green-600 text-green-400"
              : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
          }`}
        >
          전체
        </button>
        {allTickers.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTicker(t === activeTicker ? null : t)}
            className={`text-[10px] font-mono px-2 py-0.5 border transition-colors ${
              activeTicker === t
                ? "border-green-600 text-green-400"
                : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Headline list */}
      {filtered.length === 0 ? (
        <p className="text-zinc-600 text-xs">{activeTicker} 헤드라인이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.slice(0, 30).map((h, i) => (
            <li key={i} className="border-b border-zinc-900 pb-3">
              <a
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-200 hover:text-green-400 transition-colors text-xs leading-relaxed"
              >
                {h.headline}
              </a>
              <div className="flex flex-wrap items-center gap-1 mt-1">
                {h.tickers.map((tk) => (
                  <button
                    key={tk}
                    onClick={() => setActiveTicker(tk === activeTicker ? null : tk)}
                    className={`text-[10px] font-mono px-1 transition-colors ${
                      activeTicker === tk
                        ? "text-green-400 bg-zinc-800"
                        : "text-zinc-500 bg-zinc-900 hover:text-zinc-300"
                    }`}
                  >
                    [{tk}]
                  </button>
                ))}
                <span className="text-[10px] text-zinc-600">{h.source}</span>
                <span className="text-[10px] text-zinc-700">·</span>
                <span className="text-[10px] text-zinc-600">
                  {new Date(h.datetime * 1000).toLocaleString("ko-KR", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
