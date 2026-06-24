// Theme definitions (loaded from /data/themes.json)
export interface KpiConfig {
  source: "yahoo_financial" | "yahoo_price";
  ticker: string;
  metric: string;   // financial: revenueGrowth | operatingMargins | grossMargins …
                    // price: price | change1d
  label: string;
  format: "financial_pct" | "change_pct" | "price_usd" | "price_rate" | "price_number";
}

export interface KpiValue {
  label: string;
  ticker: string;
  value: number | null;
  format: "financial_pct" | "change_pct" | "price_usd" | "price_rate" | "price_number";
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  tickers: string[];
  kpis?: KpiConfig[];
}

// Per-ticker raw data collected each batch run
export interface TickerData {
  ticker: string;
  price: number;
  change1d: number;
  change5d: number;
  volume: number;
  avgVolume20d: number;
  relativeVolume: number;
  newsCount48h: number;
  newsPrev48h: number;
  marketCap?: number;
}

// Theme-level scored result
export interface ThemeScore {
  id: string;
  name: string;
  description: string;
  tickers: string[];

  newsScore: number;
  volumeScore: number;
  priceScore: number;
  totalScore: number;

  prevTotalScore: number | null;
  scoreDelta: number | null;
  deltaDirection: '▲' | '▼' | '–';

  tickerData: TickerData[];
  headlines: Headline[];
  customKpis?: KpiValue[];
}

export interface Headline {
  ticker: string;
  headline: string;
  source: string;
  url: string;
  datetime: number;
}

export interface Snapshot {
  timestamp: string;
  themes: ThemeScore[];
}

export interface HistoryPoint {
  timestamp: string;
  scores: Record<string, number>;
}
