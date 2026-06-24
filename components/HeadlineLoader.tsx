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
    // Deduplicate key: prefer URL, fall back to headline text
    const key = h.url || h.headline;
    const existing = map.get(key);
    if (existing) {
      if (!existing.tickers.includes(h.ticker)) {
        existing.tickers.push(h.ticker);
      }
    } else {
      map.set(key, {
        tickers: [h.ticker],
        headline: h.headline,
        source: h.source,
        url: h.url,
        datetime: h.datetime,
      });
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
    return <p className="text-zinc-600 text-xs font-mono animate-pulse">FETCHING HEADLINES...</p>;
  if (error)
    return <p className="text-red-600 text-xs font-mono">{error}</p>;

  const merged = mergeHeadlines(headlines);

  if (merged.length === 0)
    return <p className="text-zinc-600 text-xs">No recent headlines available.</p>;

  return (
    <ul className="space-y-3">
      {merged.slice(0, 20).map((h, i) => (
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
            {h.tickers.map((t) => (
              <span key={t} className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1">
                [{t}]
              </span>
            ))}
            <span className="text-[10px] text-zinc-600">{h.source}</span>
            <span className="text-[10px] text-zinc-700">·</span>
            <span className="text-[10px] text-zinc-600">
              {new Date(h.datetime * 1000).toLocaleString("en-US", {
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
  );
}
