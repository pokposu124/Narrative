/**
 * Reads and writes snapshot JSON files on disk.
 *
 * On Vercel serverless, process.cwd() (/var/task) is read-only.
 * Writes go to /tmp/narrativedata which is writable per-invocation.
 * Reads fall back to the bundled data/latest.json when /tmp is empty.
 */

import fs from "fs/promises";
import path from "path";
import type { Snapshot } from "@/types";

const TMP_DIR = "/tmp/narrativedata";
const TMP_SNAPSHOTS_DIR = path.join(TMP_DIR, "snapshots");
const TMP_LATEST_PATH = path.join(TMP_DIR, "latest.json");

// Bundled read-only seed file (committed to repo, used as fallback)
const BUNDLED_LATEST_PATH = path.join(process.cwd(), "data", "latest.json");

async function ensureSnapshotsDir() {
  await fs.mkdir(TMP_SNAPSHOTS_DIR, { recursive: true });
}

export async function readLatest(): Promise<Snapshot | null> {
  // Try writable /tmp copy first
  for (const p of [TMP_LATEST_PATH, BUNDLED_LATEST_PATH]) {
    try {
      const raw = await fs.readFile(p, "utf-8");
      const parsed: Snapshot = JSON.parse(raw);
      if (parsed.timestamp && parsed.themes?.length) return parsed;
    } catch {
      // try next
    }
  }
  return null;
}

export async function writeSnapshot(snapshot: Snapshot): Promise<void> {
  await ensureSnapshotsDir();

  const safeTs = snapshot.timestamp.replace(/[:.]/g, "-");
  const snapPath = path.join(TMP_SNAPSHOTS_DIR, `${safeTs}.json`);
  await fs.writeFile(snapPath, JSON.stringify(snapshot, null, 2), "utf-8");
  await fs.writeFile(TMP_LATEST_PATH, JSON.stringify(snapshot, null, 2), "utf-8");

  console.log(`[data] Snapshot written: ${safeTs}.json`);
}

export async function readAllSnapshots(): Promise<Snapshot[]> {
  await ensureSnapshotsDir();
  let files: string[];
  try {
    files = await fs.readdir(TMP_SNAPSHOTS_DIR);
  } catch {
    return [];
  }

  const snapshots: Snapshot[] = [];
  for (const file of files.filter((f) => f.endsWith(".json"))) {
    try {
      const raw = await fs.readFile(path.join(TMP_SNAPSHOTS_DIR, file), "utf-8");
      snapshots.push(JSON.parse(raw));
    } catch {
      // skip corrupted file
    }
  }

  snapshots.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return snapshots;
}

export async function readScoreHistory(): Promise<
  { timestamp: string; scores: Record<string, number> }[]
> {
  const all = await readAllSnapshots();
  return all.map((s) => ({
    timestamp: s.timestamp,
    scores: Object.fromEntries(s.themes.map((t) => [t.id, t.totalScore])),
  }));
}
