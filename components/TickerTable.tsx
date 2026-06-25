"use client";

import { useState } from "react";
import type { TickerData } from "@/types";

type SortKey = "marketCap" | "price" | "relativeVolume" | "change1d" | "change5d" | "volume" | "newsCount48h" | "relNewsVol";

const COLS: { key: SortKey; label: string }[] = [
  { key: "marketCap",      label: "시총"      },
  { key: "price",          label: "가격"      },
  { key: "relativeVolume", label: "상대거래량" },
  { key: "change1d",       label: "1D"        },
  { key: "change5d",       label: "5D"        },
  { key: "volume",         label: "거래량"    },
  { key: "newsCount48h",   label: "뉴스 48H"  },
  { key: "relNewsVol",     label: "상대뉴스"  },
];

function fmtMktCap(v?: number): string {
  if (!v) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

function fmtVol(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toLocaleString();
}

function relNewsVal(t: TickerData): number {
  const mcapB = (t.marketCap ?? 0) / 1e9;
  const logMcap = Math.max(1, Math.log10(mcapB + 1));
  return t.newsCount48h / logMcap;
}

function getVal(t: TickerData, key: SortKey): number {
  if (key === "relNewsVol") return relNewsVal(t);
  return ((t[key as keyof TickerData] ?? 0) as number);
}

function ChangeCell({ v }: { v: number }) {
  const cls = v >= 0 ? "text-green-400" : "text-red-400";
  return <span className={cls}>{v >= 0 ? "+" : ""}{v.toFixed(2)}%</span>;
}

function RelVolCell({ v }: { v: number }) {
  const cls = v >= 2 ? "text-green-400" : v >= 1.3 ? "text-yellow-400" : "text-zinc-400";
  return <span className={cls}>{v.toFixed(2)}x</span>;
}

function RelNewsCell({ t }: { t: TickerData }) {
  const v = relNewsVal(t);
  const cls = v >= 15 ? "text-green-400" : v >= 7 ? "text-yellow-400" : "text-zinc-400";
  return <span className={cls}>{v.toFixed(1)}</span>;
}

export default function TickerTable({ tickers }: { tickers: TickerData[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...tickers].sort((a, b) => {
    const av = getVal(a, sortKey);
    const bv = getVal(b, sortKey);
    return sortDir === "desc" ? bv - av : av - bv;
  });

  function thCls(key: SortKey) {
    return [
      "px-3 py-2 text-right cursor-pointer select-none transition-colors",
      sortKey === key ? "text-green-500" : "text-zinc-600 hover:text-zinc-400",
    ].join(" ");
  }

  return (
    <div>
      <div className="overflow-x-auto border border-zinc-800">
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-zinc-700 uppercase text-[10px] tracking-wider">
              <th className="px-3 py-2 text-left text-zinc-600">종목코드</th>
              {COLS.map((c) => (
                <th key={c.key} className={thCls(c.key)} onClick={() => handleSort(c.key)}>
                  {c.label}
                  {sortKey === c.key && (
                    <span className="ml-0.5">{sortDir === "desc" ? " ↓" : " ↑"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => (
              <tr key={t.ticker} className="border-b border-zinc-900 hover:bg-zinc-900/60 transition-colors">
                <td className="px-3 py-2 text-zinc-100 font-bold tracking-wide">{t.ticker}</td>
                <td className="px-3 py-2 text-right text-zinc-400">{fmtMktCap(t.marketCap)}</td>
                <td className="px-3 py-2 text-right text-zinc-200">
                  ${t.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-2 text-right"><RelVolCell v={t.relativeVolume} /></td>
                <td className="px-3 py-2 text-right"><ChangeCell v={t.change1d} /></td>
                <td className="px-3 py-2 text-right"><ChangeCell v={t.change5d} /></td>
                <td className="px-3 py-2 text-right text-zinc-400">{fmtVol(t.volume)}</td>
                <td className="px-3 py-2 text-right text-zinc-400">{t.newsCount48h}</td>
                <td className="px-3 py-2 text-right"><RelNewsCell t={t} /></td>
              </tr>
            ))}
            {tickers.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-4 text-center text-zinc-600">데이터 없음</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-zinc-600 font-mono mt-1.5">
        상대거래량: 오늘 거래량 ÷ 20일 평균. · 상대뉴스: 뉴스 ÷ log(시총). 시총 대비 화제성—생략 나오면 높음.
      </p>
    </div>
  );
}
