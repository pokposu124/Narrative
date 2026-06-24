import YahooFinance from "yahoo-finance2";
import type { KpiConfig, KpiValue } from "@/types";
import { fetchEdgarMetric } from "@/lib/edgar";

const yf = new YahooFinance();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchFinancial(
  ticker: string,
  metric: string
): Promise<number | null> {
  try {
    const summary = await yf.quoteSummary(ticker, {
      modules: ["financialData"],
    });
    const data = summary.financialData as Record<string, unknown> | undefined;
    if (!data) return null;
    const val = data[metric];
    return typeof val === "number" ? val : null;
  } catch {
    return null;
  }
}

async function fetchPrice(
  ticker: string,
  metric: string
): Promise<number | null> {
  try {
    const quote = await yf.quote(ticker);
    if (metric === "price") return quote.regularMarketPrice ?? null;
    if (metric === "change1d") {
      const price = quote.regularMarketPrice ?? 0;
      const prev = quote.regularMarketPreviousClose ?? price;
      return prev !== 0 ? ((price - prev) / prev) * 100 : 0;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchThemeKpis(
  configs: KpiConfig[],
  delayMs = 250
): Promise<KpiValue[]> {
  const results: KpiValue[] = [];

  for (const cfg of configs) {
    let value: number | null = null;
    if (cfg.source === "yahoo_financial") {
      value = await fetchFinancial(cfg.ticker, cfg.metric);
    } else if (cfg.source === "yahoo_price") {
      value = await fetchPrice(cfg.ticker, cfg.metric);
    } else if (cfg.source === "edgar") {
      value = await fetchEdgarMetric(cfg.ticker, cfg.metric);
    }

    results.push({
      label: cfg.label,
      ticker: cfg.ticker,
      value,
      format: cfg.format,
    });

    await sleep(delayMs);
  }

  return results;
}
