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
 * Uses 10-Q form + end date to find the most recent standalone quarter.
 * Duration filter (50–120 days) excludes YTD cumulative values.
 * Falls back to CY frame pattern for calendar-aligned fiscal years.
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

    // Primary: 10-Q filings with standalone quarter duration (50–120 days)
    for (const concept of concepts) {
      const usd = (usgaap[concept]?.units?.USD ?? []) as Array<{
        start?: string;
        end: string;
        val: number;
        form: string;
      }>;

      const quarterly = usd
        .filter((e) => {
          if (e.form !== "10-Q" || !e.start || !e.end) return false;
          const days =
            (new Date(e.end).getTime() - new Date(e.start).getTime()) / 86_400_000;
          return days >= 50 && days <= 120;
        })
        .sort((a, b) => b.end.localeCompare(a.end));

      if (quarterly.length > 0) return quarterly[0].val;
    }

    // Fallback: CY frame pattern (works for calendar-aligned fiscal years)
    for (const concept of concepts) {
      const usd = (usgaap[concept]?.units?.USD ?? []) as Array<{
        frame?: string;
        val: number;
      }>;

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
