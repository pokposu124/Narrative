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

function endDateToCalendarQuarter(endDate: string): string {
  const d = new Date(endDate);
  const year = d.getUTCFullYear();
  const q = Math.ceil((d.getUTCMonth() + 1) / 3);
  return `${year} Q${q}`;
}

/**
 * Fetch a financial metric for a ticker from SEC EDGAR XBRL API.
 * No API key required — just a User-Agent header per SEC guidelines.
 *
 * Returns { val, period } where period is the calendar quarter of the data
 * (e.g. "2025 Q1"), or null if not found.
 */
export async function fetchEdgarMetric(
  ticker: string,
  metric: string
): Promise<{ val: number; period: string } | null> {
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

      if (quarterly.length > 0) {
        return {
          val: quarterly[0].val,
          period: endDateToCalendarQuarter(quarterly[0].end),
        };
      }
    }

    // Fallback: CY frame pattern (for calendar-aligned fiscal years)
    for (const concept of concepts) {
      const usd = (usgaap[concept]?.units?.USD ?? []) as Array<{
        frame?: string;
        end?: string;
        val: number;
      }>;

      const quarterly = usd
        .filter((e) => e.frame && /^CY\d{4}Q\d$/.test(e.frame))
        .sort((a, b) => (b.frame ?? "").localeCompare(a.frame ?? ""));

      if (quarterly.length > 0) {
        const item = quarterly[0];
        const period = item.end
          ? endDateToCalendarQuarter(item.end)
          : (item.frame?.replace("CY", "").replace("Q", " Q") ?? "");
        return { val: item.val, period };
      }
    }

    return null;
  } catch {
    return null;
  }
}
