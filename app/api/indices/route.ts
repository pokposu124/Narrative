/**
 * Returns current values for major market indices.
 * Called by the client every 60 seconds to keep the top bar live.
 *
 * NOTE: Data is sourced from Yahoo Finance's unofficial API and may be
 * delayed ~15 minutes.
 */

import { NextResponse } from "next/server";
import { fetchIndices } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const indices = await fetchIndices();
    return NextResponse.json(
      { ok: true, data: indices, fetchedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=55, stale-while-revalidate=10",
        },
      }
    );
  } catch (err) {
    console.error("[indices] Fetch failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
