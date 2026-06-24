import type { ThemeDefinition, TickerData, ThemeScore, Snapshot } from "@/types";

const WEIGHTS = { news: 0.40, volume: 0.35, price: 0.25 };

function newsRaw(tickers: TickerData[]): number {
  if (tickers.length === 0) return 0;
  // Divide each ticker's news count by log10(marketCap_billions + 1)
  // so large-caps (NVDA, MSFT) don't dominate purely by volume of coverage.
  const weightedRecent = tickers.reduce((s, t) => {
    const mcapB = (t.marketCap ?? 0) / 1e9;
    const w = Math.max(1, Math.log10(mcapB + 1));
    return s + t.newsCount48h / w;
  }, 0);
  const weightedPrev = tickers.reduce((s, t) => {
    const mcapB = (t.marketCap ?? 0) / 1e9;
    const w = Math.max(1, Math.log10(mcapB + 1));
    return s + t.newsPrev48h / w;
  }, 0);
  const accel = (weightedRecent - weightedPrev) / Math.max(weightedPrev, 1);
  return weightedRecent * (1 + accel);
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
  const volRaws  = themeTickerData.map(volumeRaw);
  const priceRaws = themeTickerData.map(priceRaw);

  // Apply floor of 5 so Finnhub free-tier coverage gaps don't zero out a theme
  const newsNorm  = normaliseArray(newsRaws).map((v) => Math.max(5, v));
  const volNorm   = normaliseArray(volRaws);
  const priceNorm = normaliseArray(priceRaws);

  const prevMap = new Map<string, number>();
  if (prevSnapshot) {
    for (const t of prevSnapshot.themes) {
      prevMap.set(t.id, t.totalScore);
    }
  }

  return themes.map((theme, i) => {
    const newsScore   = Math.round(newsNorm[i]  * 10) / 10;
    const volumeScore = Math.round(volNorm[i]   * 10) / 10;
    const priceScore  = Math.round(priceNorm[i] * 10) / 10;

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
