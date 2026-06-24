/**
 * Batch orchestrator: fetch market data → score themes → persist snapshot.
 */

import { fetchTickersBatch } from "@/lib/yahoo";
import { fetchNewsCountsBatch, fetchThemeHeadlines } from "@/lib/finnhub";
import { computeScores } from "@/lib/scoring";
import { readLatest, writeSnapshot } from "@/lib/data";
import type { Snapshot } from "@/types";
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

  // 1. Fetch price/volume data
  const tickerDataMap = await fetchTickersBatch(allTickers, 350);

  // 2. Fetch news counts
  const newsCountMap = await fetchNewsCountsBatch(allTickers, 550);

  // 3. Score themes
  const prevSnapshot = await readLatest();
  const scored = computeScores(themes, tickerDataMap, newsCountMap, prevSnapshot);

  // 4. Fetch headlines per theme (top 3 tickers each)
  for (const theme of scored) {
    const topTickers = theme.tickers.slice(0, 3);
    theme.headlines = await fetchThemeHeadlines(topTickers, 550);
  }

  const snapshot: Snapshot = {
    timestamp: new Date().toISOString(),
    themes: scored,
  };

  // 5. Persist
  const githubStatus = await writeSnapshot(snapshot);

  return { ...snapshot, githubStatus };
}
