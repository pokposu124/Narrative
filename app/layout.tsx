import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import IndexBar from "@/components/IndexBar";

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Narrative Tracker — 미국 시장 테마",
  description:
    "미국 주식 시장을 이끄는 테마·내러티브 실시간 순위. 데이터 약 15분 지연. 투자 조언 아님.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${mono.variable} dark`}>
      <body className="font-mono bg-zinc-950 text-zinc-100 min-h-screen">
        <IndexBar />
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        <footer className="max-w-6xl mx-auto px-4 py-8 border-t border-zinc-800 mt-12">
          <div className="text-zinc-600 text-[11px] font-mono space-y-1.5">
            <p>
              데이터 출자: 가격/거래량 — yahoo-finance2 (비공식 Yahoo Finance API, 예고 없이 변경될 수 있음). 뉴스 — Finnhub 무료 티어.
            </p>
            <p>모든 시세는 약 15분 지연됩니다.</p>
            <p className="text-zinc-500">
              면접 고지: 본 사이트는 정보 제공 목적으로만 운영되며 투자 조언을 구성하지 않습니다. 과거 성과는 미래 결과를 보장하지 않습니다. 본 데이터만을 근거로 투자 결정을 내리지 마십시오.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
