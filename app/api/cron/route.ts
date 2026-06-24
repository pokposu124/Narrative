/**
 * Vercel Cron endpoint — runs every 6 hours.
 * Schedule is defined in vercel.json.
 *
 * Vercel sends an Authorization header with the value "Bearer {CRON_SECRET}".
 * Set CRON_SECRET in Vercel environment variables to protect this route.
 */

import { NextResponse } from "next/server";
import { runBatch } from "@/lib/batch";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
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
    console.error("[cron] Batch failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
