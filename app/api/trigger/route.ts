/**
 * Manual batch trigger.
 * GET  /api/trigger?secret=CRON_SECRET — for browser/phone access.
 * POST /api/trigger with Authorization: Bearer <secret> — for scripts.
 */

import { NextResponse } from "next/server";
import { runBatch } from "@/lib/batch";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;

  const url = new URL(request.url);
  if (url.searchParams.get("secret") === cronSecret) return true;

  return false;
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runBatch();
    return NextResponse.json({
      ok: true,
      timestamp: result.timestamp,
      themeCount: result.themes.length,
      github: result.githubStatus,
    });
  } catch (err) {
    console.error("[trigger] Batch failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
