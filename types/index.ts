export interface KpiConfig {
  source: "yahoo_financial" | "yahoo_price" | "edgar";
  ticker: string;
  metric: string;
  label: string;
  format: "financial_pct" | "change_pct" | "price_usd" | "price_rate" | "price_number" | "price_billions";
}

export interface KpiValue {
  label: string;
  ticker: string;
  value: number | null;
  format: "financial_pct" | "change_pct" | "price_usd" | "price_rate" | "price_number" | "price_billions";
  period?: string;  // e.g. "2025 Q1", "TTM"
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  tickers: string[];
  kpis?: KpiConfig[];
}

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
