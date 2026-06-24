const EDGAR_BASE = "https://data.sec.gov";

const TICKER_CIK: Record<string, string> = {
  NVDA: "0001045810",
  LLY:  "0000059478",
  AMAT: "0000910638",
  ETN:  "0001551182",
  MSFT: "0000789019",
};

const REVENUE_CONCEPTS = [
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "Revenues",
  "SalesRevenueNet",
];

/**
 * Fetch a financial metric for a ticker from SEC EDGAR XBRL API.
 * No API key required — just a User-Agent header per SEC guidelines.
 *
 * metric: 'revenue' tries common revenue concepts;
 *         any other string is used as the exact us-gaap concept name.
 *
 * Returns the most recent standalone quarterly value (CY20xxQx frame),
 * or null if not found / not a supported ticker.
 */
export async function fetchEdgarMetric(
  ticker: string,
  metric: string
): Promise<number | null> {
  const cik = TICKER_CIK[ticker];
  if (!cik) return null;

  try {
    const url = `${EDGAR_BASE}/api/xbrl/companyfacts/CIK${cik}.json`;
    const res = await fetch(url, {
      headers: { "User-Agent": "NarrativeTracker contact@narrative.dev" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const usgaap = data?.facts?.["us-gaap"];
    if (!usgaap) return null;

    const concepts = metric === "revenue" ? REVENUE_CONCEPTS : [metric];

    for (const concept of concepts) {
      const usd = (usgaap[concept]?.units?.USD ?? []) as Array<{
        frame?: string;
        val: number;
      }>;

      // CY2024Q1 = standalone single-quarter value (not YTD cumulative)
      const quarterly = usd
        .filter((e) => e.frame && /^CY\d{4}Q\d$/.test(e.frame))
        .sort((a, b) => (b.frame ?? "").localeCompare(a.frame ?? ""));

      if (quarterly.length > 0) return quarterly[0].val;
    }

    return null;
  } catch {
    return null;
  }
}
