import { NextResponse } from "next/server";
import { readLatest } from "@/lib/data";
import { fetchThemeHeadlines } from "@/lib/finnhub";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ themeId: string }> }
) {
  const { themeId } = await params;

  const snapshot = await readLatest();
  if (!snapshot) {
    return NextResponse.json({ headlines: [] });
  }

  const theme = snapshot.themes.find((t) => t.id === themeId);
  if (!theme) {
    return NextResponse.json({ error: "Theme not found" }, { status: 404 });
  }

  const tickers = theme.tickers.slice(0, 4);
  const headlines = await fetchThemeHeadlines(tickers, 300);

  return NextResponse.json({ headlines });
}
