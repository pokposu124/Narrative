/**
 * Wrapper around yahoo-finance2.
 *
 * NOTE: yahoo-finance2 uses Yahoo Finance's *unofficial* API.
 * Yahoo may change the schema or block requests without notice.
 *
 * API change (v3+): Must instantiate with `new YahooFinance()` rather than
 * calling the default export directly (static methods are deprecated).
 */

import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance();

export interface PriceData {
  ticker: string;
  price: number;
  change1d: number;
  change5d: number;
  volume: number;
  avgVolume20d: number;
  relativeVolume: number;
  marketCap: number;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchOneTicker(ticker: string): Promise<PriceData | null> {
  try {
    const quote = await yf.quote(ticker);

    const price = quote.regularMarketPrice ?? 0;
    const prevClose = quote.regularMarketPreviousClose ?? price;
    const change1d = prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    const volume = quote.regularMarketVolume ?? 0;
    const marketCap = quote.marketCap ?? 0;

    const avgVolume20d =
      quote.averageDailyVolume10Day ??
      quote.averageDailyVolume3Month ??
      volume;

    const relativeVolume = avgVolume20d > 0 ? volume / avgVolume20d : 1;

    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 10);

    const history = await yf.historical(ticker, {
      period1: from.toISOString().split("T")[0],
      period2: to.toISOString().split("T")[0],
      interval: "1d",
    });

    let change5d = 0;
    if (history.length >= 2) {
      const oldest = history[Math.max(0, history.length - 6)].close ?? history[0].close;
      const latest = history[history.length - 1].close ?? price;
      change5d = oldest !== 0 ? ((latest - oldest) / oldest) * 100 : 0;
    }

    return { ticker, price, change1d, change5d, volume, avgVolume20d, relativeVolume, marketCap };
  } catch (err) {
    console.warn(`[yahoo] Failed to fetch ${ticker}:`, err);
    return null;
  }
}

export async function fetchTickersBatch(
  tickers: string[],
  delayMs = 400
): Promise<Map<string, PriceData>> {
  const result = new Map<string, PriceData>();
  const unique = [...new Set(tickers)];

  for (const ticker of unique) {
    const data = await fetchOneTicker(ticker);
    if (data) result.set(ticker, data);
    await sleep(delayMs);
  }

  return result;
}

export async function fetchIndices() {
  const symbols = ["^IXIC", "^GSPC", "^RUT", "^VIX"];
  const results: Record<
    string,
    { symbol: string; price: number; change: number; changePct: number }
  > = {};

  for (const sym of symbols) {
    try {
      const q = await yf.quote(sym);
      results[sym] = {
        symbol: sym,
        price: q.regularMarketPrice ?? 0,
        change: q.regularMarketChange ?? 0,
        changePct: q.regularMarketChangePercent ?? 0,
      };
    } catch {
      results[sym] = { symbol: sym, price: 0, change: 0, changePct: 0 };
    }
    await sleep(200);
  }

  return results;
}
