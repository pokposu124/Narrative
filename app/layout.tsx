import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import IndexBar from "@/components/IndexBar";

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Narrative Tracker — US Market Themes",
  description:
    "Real-time ranking of narrative/themes driving US equity markets. Data delayed ~15 min. Not investment advice.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${mono.variable} dark`}>
      <body className="font-mono bg-zinc-950 text-zinc-100 min-h-screen">
        <IndexBar />
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        <footer className="max-w-6xl mx-auto px-4 py-8 border-t border-zinc-800 mt-12">
          <div className="text-zinc-600 text-[11px] font-mono space-y-1.5">
            <p>
              DATA SOURCES: Price/volume via yahoo-finance2 (unofficial Yahoo Finance API — may
              break without notice). News via Finnhub free tier.
            </p>
            <p>All quotes are delayed approximately 15 minutes.</p>
            <p className="text-zinc-500">
              DISCLAIMER: This site is for informational purposes only and does NOT constitute
              investment advice. Past performance is not indicative of future results. Do not make
              investment decisions based solely on this data.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
