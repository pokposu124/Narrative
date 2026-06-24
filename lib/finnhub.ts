/**
 * Finnhub API client (free tier).
 *
 * Free tier limits: ~60 API calls/minute.
 * We use company-news endpoint to count recent headlines per ticker.
 *
 * Set FINNHUB_API_KEY in .env.local (local) or Vercel environment variables.
 */

import type { Headline } from "@/types";

const BASE_URL = "https://finnhub.io/api/v1";

function getApiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("FINNHUB_API_KEY environment variable is not set");
  return key;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface FinnhubNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

async function fetchCompanyNews(
  ticker: string,
  from: string,
  to: string
): Promise<FinnhubNewsItem[]> {
  const key = getApiKey();
  const url = `${BASE_URL}/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${key}`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`Finnhub ${res.status} for ${ticker}: ${await res.text()}`);
  }
  return res.json();
}

export async function getNewsWindowCounts(ticker: string): Promise<{
  newsCount48h: number;
  newsPrev48h: number;
}> {
  const now = new Date();
  const d2 = now.toISOString().split("T")[0];
  const d1 = new Date(now.getTime() - 2 * 86400_000).toISOString().split("T")[0];
  const d0 = new Date(now.getTime() - 4 * 86400_000).toISOString().split("T")[0];

  try {
    const [recent, prev] = await Promise.all([
      fetchCompanyNews(ticker, d1, d2),
      fetchCompanyNews(ticker, d0, d1),
    ]);
    return { newsCount48h: recent.length, newsPrev48h: prev.length };
  } catch (err) {
    console.warn(`[finnhub] news fetch failed for ${ticker}:`, err);
    return { newsCount48h: 0, newsPrev48h: 0 };
  }
}

export async function fetchThemeHeadlines(
  tickers: string[],
  delayMs = 600
): Promise<Headline[]> {
  const now = new Date();
  const to = now.toISOString().split("T")[0];
  const from = new Date(now.getTime() - 3 * 86400_000).toISOString().split("T")[0];

  const headlines: Headline[] = [];

  for (const ticker of tickers) {
    try {
      const items = await fetchCompanyNews(ticker, from, to);
      for (const item of items.slice(0, 10)) {
        headlines.push({
          ticker,
          headline: item.headline,
          source: item.source,
          url: item.url,
          datetime: item.datetime,
        });
      }
    } catch {
      // silently skip on error
    }
    await sleep(delayMs);
  }

  headlines.sort((a, b) => b.datetime - a.datetime);
  return headlines;
}

export async function fetchNewsCountsBatch(
  tickers: string[],
  delayMs = 600
): Promise<Map<string, { newsCount48h: number; newsPrev48h: number }>> {
  const result = new Map<string, { newsCount48h: number; newsPrev48h: number }>();
  const unique = [...new Set(tickers)];

  for (const ticker of unique) {
    const counts = await getNewsWindowCounts(ticker);
    result.set(ticker, counts);
    await sleep(delayMs);
  }

  return result;
}
