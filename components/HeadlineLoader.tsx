"use client";

import { useState, useEffect } from "react";
import type { Headline } from "@/types";

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

  if (loading) {
    return (
      <p className="text-zinc-600 text-xs font-mono animate-pulse">
        FETCHING HEADLINES...
      </p>
    );
  }

  if (error) {
    return <p className="text-red-600 text-xs font-mono">{error}</p>;
  }

  if (headlines.length === 0) {
    return (
      <p className="text-zinc-600 text-xs">No recent headlines available.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {headlines.slice(0, 20).map((h, i) => (
        <li key={i} className="border-b border-zinc-900 pb-3">
          <a
            href={h.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-200 hover:text-green-400 transition-colors text-xs leading-relaxed"
          >
            {h.headline}
          </a>
          <div className="flex gap-2 mt-1 text-[10px] text-zinc-600">
            <span className="text-zinc-500 font-mono">[{h.ticker}]</span>
            <span>{h.source}</span>
            <span>·</span>
            <span>
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
