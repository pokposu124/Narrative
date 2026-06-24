/**
 * Manual batch trigger for local development / testing.
 * POST /api/trigger — runs the full data collection and scoring pipeline.
 * GET  /api/trigger?secret=CRON_SECRET — same, for browser/phone access.
 */

import { NextResponse } from "next/server";
import { runBatch } from "@/lib/batch";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;

  // POST: Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;

  // GET: ?secret= query param
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === cronSecret) return true;

  return false;
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
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

export const GET = handle;
export const POST = handle;
