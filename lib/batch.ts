/**
 * Batch orchestrator: fetch market data → score themes → persist snapshot.
 */

import { fetchTickersBatch } from "@/lib/yahoo";
import { fetchNewsCountsBatch, fetchThemeHeadlines } from "@/lib/finnhub";
import { computeScores } from "@/lib/scoring";
import { readLatest, writeSnapshot } from "@/lib/data";
import type { Snapshot, TickerData } from "@/types";
import themesRaw from "@/data/themes.json";

interface RawTheme {
  id: string;
  name: string;
  description: string;
  tickers: string[];
}

export async function runBatch(): Promise<Snapshot & { githubStatus: string }> {
  const themes = themesRaw as RawTheme[];
  const allTickers = [...new Set(themes.flatMap((t) => t.tickers))];

  // 1. Fetch price/volume/marketcap data
  const priceDataMap = await fetchTickersBatch(allTickers, 350);

  // 2. Fetch news counts
  const newsCountMap = await fetchNewsCountsBatch(allTickers, 550);

  // 3. Merge PriceData + news counts into TickerData
  const tickerDataMap = new Map<string, TickerData>();
  for (const [ticker, price] of priceDataMap) {
    const news = newsCountMap.get(ticker) ?? { newsCount48h: 0, newsPrev48h: 0 };
    tickerDataMap.set(ticker, {
      ticker: price.ticker,
      price: price.price,
      change1d: price.change1d,
      change5d: price.change5d,
      volume: price.volume,
      avgVolume20d: price.avgVolume20d,
      relativeVolume: price.relativeVolume,
      marketCap: price.marketCap,
      newsCount48h: news.newsCount48h,
      newsPrev48h: news.newsPrev48h,
    });
  }

  // 4. Score themes
  const prevSnapshot = await readLatest();
  const scored = computeScores(themes, tickerDataMap, prevSnapshot);

  // 5. Fetch headlines for top 3 tickers per theme
  for (const theme of scored) {
    const topTickers = theme.tickers.slice(0, 3);
    theme.headlines = await fetchThemeHeadlines(topTickers, 400);
  }

  const snapshot: Snapshot = {
    timestamp: new Date().toISOString(),
    themes: scored,
  };

  // 6. Persist and return github write-back status for diagnostics
  const githubStatus = await writeSnapshot(snapshot);

  return { ...snapshot, githubStatus };
}
