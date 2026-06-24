"use client";

import { useEffect, useState } from "react";

interface IndexQuote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
}

const LABEL: Record<string, string> = {
  "^IXIC": "NASDAQ",
  "^GSPC": "S&P 500",
  "^RUT": "RUT",
  "^VIX": "VIX",
};

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function sign(n: number) {
  return n >= 0 ? "+" : "";
}

export default function IndexBar() {
  const [quotes, setQuotes] = useState<Record<string, IndexQuote>>({});
  const [fetchedAt, setFetchedAt] = useState<string>("");
  const [error, setError] = useState(false);

  async function refresh() {
    try {
      const res = await fetch("/api/indices");
      if (!res.ok) throw new Error("Non-OK response");
      const json = await res.json();
      setQuotes(json.data ?? {});
      setFetchedAt(json.fetchedAt ?? "");
      setError(false);
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, []);

  const symbols = ["^IXIC", "^GSPC", "^RUT", "^VIX"];

  return (
    <div className="border-b border-zinc-700 bg-zinc-950 px-4 py-2 flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-xs">
      {symbols.map((sym) => {
        const q = quotes[sym];
        if (!q) {
          return (
            <span key={sym} className="text-zinc-500">
              {LABEL[sym]}: —
            </span>
          );
        }
        const isVix = sym === "^VIX";
        const up = isVix ? q.change < 0 : q.change >= 0;
        const color = up ? "text-green-400" : "text-red-400";
        return (
          <span key={sym} className="flex items-baseline gap-1.5">
            <span className="text-zinc-400 uppercase tracking-wide">{LABEL[sym]}</span>
            <span className="text-zinc-100">{fmt(q.price, 2)}</span>
            <span className={color}>
              {sign(q.change)}{fmt(q.change, 2)} ({sign(q.changePct)}{fmt(q.changePct, 2)}%)
            </span>
          </span>
        );
      })}

      <span className="ml-auto text-zinc-600 text-[10px]">
        {error ? "DATA ERROR" : "Quotes delayed ~15 min"}
      </span>
    </div>
  );
}
