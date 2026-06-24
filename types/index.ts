// Theme definitions (loaded from /data/themes.json)
export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  tickers: string[];
}

// Per-ticker raw data collected each batch run
export interface TickerData {
  ticker: string;
  price: number;
  change1d: number;        // % change vs previous close
  change5d: number;        // % change over last 5 trading days
  volume: number;          // today's volume
  avgVolume20d: number;    // 20-day average volume
  relativeVolume: number;  // volume / avgVolume20d
  newsCount48h: number;    // Finnhub news articles in last 48h
  newsPrev48h: number;     // Finnhub news articles in previous 48h window
  marketCap?: number;      // market capitalisation in USD (optional — populated from v2 batch)
}

// Theme-level scored result
export interface ThemeScore {
  id: string;
  name: string;
  description: string;
  tickers: string[];

  // Raw component scores (0-100 after percentile normalisation)
  newsScore: number;
  volumeScore: number;
  priceScore: number;

  // Weighted composite (0-100)
  totalScore: number;

  // Delta vs previous snapshot
  prevTotalScore: number | null;
  scoreDelta: number | null;
  deltaDirection: '▲' | '▼' | '–';

  // Per-ticker breakdown for detail page
  tickerData: TickerData[];

  // Recent Finnhub headlines for detail page
  headlines: Headline[];
}

// News headline from Finnhub
export interface Headline {
  ticker: string;
  headline: string;
  source: string;
  url: string;
  datetime: number;  // Unix timestamp (seconds)
}

// A single snapshot persisted to disk
export interface Snapshot {
  timestamp: string;       // ISO-8601
  themes: ThemeScore[];
}

// Minimal record kept in snapshot history for chart
export interface HistoryPoint {
  timestamp: string;
  scores: Record<string, number>;  // themeId → totalScore
}
