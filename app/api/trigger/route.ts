/**
 * Manual batch trigger for local development / testing.
 * POST /api/trigger — runs the full data collection and scoring pipeline.
 */

import { NextResponse } from "next/server";
import { runBatch } from "@/lib/batch";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await runBatch();
    return NextResponse.json({
      ok: true,
      timestamp: snapshot.timestamp,
      themeCount: snapshot.themes.length,
    });
  } catch (err) {
    console.error("[trigger] Batch failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
