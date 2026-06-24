/**
 * Orchestrates a full data collection + scoring run.
 * Called by the cron API route and optionally by the manual trigger route.
 */

import type { ThemeDefinition, TickerData, Snapshot } from "@/types";
import { fetchTickersBatch } from "@/lib/yahoo";
import { fetchNewsCountsBatch, fetchThemeHeadlines } from "@/lib/finnhub";
import { computeScores } from "@/lib/scoring";
import { readLatest, writeSnapshot } from "@/lib/data";
import themesJson from "@/data/themes.json";

const themes: ThemeDefinition[] = themesJson as ThemeDefinition[];

function allTickers(): string[] {
  return [...new Set(themes.flatMap((t) => t.tickers))];
}

export async function runBatch(): Promise<Snapshot> {
  const startedAt = new Date().toISOString();
  console.log(`[batch] Starting at ${startedAt}`);

  const tickers = allTickers();
  console.log(`[batch] Fetching data for ${tickers.length} unique tickers`);

  // 1. Price/volume from Yahoo Finance (unofficial API)
  const priceMap = await fetchTickersBatch(tickers, 350);
  console.log(`[batch] Price data received for ${priceMap.size}/${tickers.length} tickers`);

  // 2. News counts from Finnhub (free tier: ~60 req/min)
  const newsMap = await fetchNewsCountsBatch(tickers, 550);
  console.log(`[batch] News counts received for ${newsMap.size}/${tickers.length} tickers`);

  // 3. Merge into TickerData map
  const tickerDataMap = new Map<string, TickerData>();
  for (const ticker of tickers) {
    const price = priceMap.get(ticker);
    const news = newsMap.get(ticker) ?? { newsCount48h: 0, newsPrev48h: 0 };

    if (!price) {
      console.warn(`[batch] No price data for ${ticker}, skipping`);
      continue;
    }

    tickerDataMap.set(ticker, {
      ticker,
      price: price.price,
      change1d: price.change1d,
      change5d: price.change5d,
      volume: price.volume,
      avgVolume20d: price.avgVolume20d,
      relativeVolume: price.relativeVolume,
      newsCount48h: news.newsCount48h,
      newsPrev48h: news.newsPrev48h,
    });
  }

  // 4. Previous snapshot for delta calculation
  const prevSnapshot = await readLatest();

  // 5. Compute scores
  const themeScores = computeScores(themes, tickerDataMap, prevSnapshot);

  // 6. Fetch headlines per theme
  for (const themeScore of themeScores) {
    try {
      const headlines = await fetchThemeHeadlines(themeScore.tickers, 550);
      themeScore.headlines = headlines.slice(0, 20);
    } catch (err) {
      console.warn(`[batch] Headline fetch failed for ${themeScore.id}:`, err);
    }
  }

  // 7. Sort by totalScore descending
  themeScores.sort((a, b) => b.totalScore - a.totalScore);

  // 8. Build snapshot
  const snapshot: Snapshot = {
    timestamp: new Date().toISOString(),
    themes: themeScores,
  };

  // 9. Persist
  await writeSnapshot(snapshot);

  const elapsed = Date.now() - new Date(startedAt).getTime();
  console.log(`[batch] Done in ${(elapsed / 1000).toFixed(1)}s`);

  return snapshot;
}
