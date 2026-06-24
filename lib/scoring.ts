/**
 * Theme scoring engine.
 *
 * Composite score = 0.40 × news + 0.35 × volume + 0.25 × price
 *
 * Each raw metric is first aggregated to a theme-level scalar,
 * then percentile-normalised to [0, 100] across all themes.
 */

import type { ThemeDefinition, TickerData, ThemeScore, Snapshot } from "@/types";
import type { PriceData } from "@/lib/yahoo";

const WEIGHTS = { news: 0.40, volume: 0.35, price: 0.25 };

function newsRaw(tickers: TickerData[]): number {
  const recent = tickers.reduce((s, t) => s + t.newsCount48h, 0);
  const prev = tickers.reduce((s, t) => s + t.newsPrev48h, 0);
  const acceleration = (recent - prev) / Math.max(prev, 1);
  return recent + acceleration * recent;
}

function volumeRaw(tickers: TickerData[]): number {
  if (tickers.length === 0) return 0;
  return tickers.reduce((s, t) => s + t.relativeVolume, 0) / tickers.length;
}

function priceRaw(tickers: TickerData[]): number {
  if (tickers.length === 0) return 0;
  return tickers.reduce((s, t) => s + t.change5d, 0) / tickers.length;
}

function percentileRank(value: number, sorted: number[]): number {
  if (sorted.length === 0) return 50;
  const below = sorted.filter((v) => v < value).length;
  return (below / sorted.length) * 100;
}

function normaliseArray(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  return values.map((v) => percentileRank(v, sorted));
}

export function computeScores(
  themes: ThemeDefinition[],
  tickerDataMap: Map<string, TickerData>,
  prevSnapshot: Snapshot | null
): ThemeScore[] {
  const themeTickerData = themes.map((theme) =>
    theme.tickers
      .map((t) => tickerDataMap.get(t))
      .filter((d): d is TickerData => d !== undefined)
  );

  const newsRaws = themeTickerData.map(newsRaw);
  const volRaws = themeTickerData.map(volumeRaw);
  const priceRaws = themeTickerData.map(priceRaw);

  const newsNorm = normaliseArray(newsRaws);
  const volNorm = normaliseArray(volRaws);
  const priceNorm = normaliseArray(priceRaws);

  const prevMap = new Map<string, number>();
  if (prevSnapshot) {
    for (const t of prevSnapshot.themes) {
      prevMap.set(t.id, t.totalScore);
    }
  }

  return themes.map((theme, i) => {
    const newsScore = Math.round(newsNorm[i] * 10) / 10;
    const volumeScore = Math.round(volNorm[i] * 10) / 10;
    const priceScore = Math.round(priceNorm[i] * 10) / 10;

    const totalScore = Math.round(
      (WEIGHTS.news * newsScore + WEIGHTS.volume * volumeScore + WEIGHTS.price * priceScore) * 10
    ) / 10;

    const prevTotalScore = prevMap.get(theme.id) ?? null;
    const scoreDelta = prevTotalScore !== null
      ? Math.round((totalScore - prevTotalScore) * 10) / 10
      : null;

    let deltaDirection: '▲' | '▼' | '–';
    if (scoreDelta === null || Math.abs(scoreDelta) < 0.1) {
      deltaDirection = '–';
    } else if (scoreDelta > 0) {
      deltaDirection = '▲';
    } else {
      deltaDirection = '▼';
    }

    return {
      id: theme.id,
      name: theme.name,
      description: theme.description,
      tickers: theme.tickers,
      newsScore,
      volumeScore,
      priceScore,
      totalScore,
      prevTotalScore,
      scoreDelta,
      deltaDirection,
      tickerData: themeTickerData[i],
      headlines: [],
    } satisfies ThemeScore;
  });
}
