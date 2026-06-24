/**
 * Reads and writes snapshot JSON files on disk.
 *
 * NOTE: On Vercel's serverless runtime, the filesystem is read-only for
 * deployed code. Writing files works in /tmp during execution but those
 * changes are not persisted across invocations. For production durability,
 * replace this module with Vercel KV, PlanetScale, or S3.
 */

import fs from "fs/promises";
import path from "path";
import type { Snapshot } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const SNAPSHOTS_DIR = path.join(DATA_DIR, "snapshots");
const LATEST_PATH = path.join(DATA_DIR, "latest.json");

async function ensureSnapshotsDir() {
  await fs.mkdir(SNAPSHOTS_DIR, { recursive: true });
}

export async function readLatest(): Promise<Snapshot | null> {
  try {
    const raw = await fs.readFile(LATEST_PATH, "utf-8");
    const parsed: Snapshot = JSON.parse(raw);
    if (!parsed.timestamp || !parsed.themes?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeSnapshot(snapshot: Snapshot): Promise<void> {
  await ensureSnapshotsDir();

  const safeTs = snapshot.timestamp.replace(/[:.]/g, "-");
  const snapPath = path.join(SNAPSHOTS_DIR, `${safeTs}.json`);
  await fs.writeFile(snapPath, JSON.stringify(snapshot, null, 2), "utf-8");
  await fs.writeFile(LATEST_PATH, JSON.stringify(snapshot, null, 2), "utf-8");

  console.log(`[data] Snapshot written: ${safeTs}.json`);

  // TODO: prune old snapshots if count exceeds a limit (e.g., keep last 90 days).
}

export async function readAllSnapshots(): Promise<Snapshot[]> {
  await ensureSnapshotsDir();
  let files: string[];
  try {
    files = await fs.readdir(SNAPSHOTS_DIR);
  } catch {
    return [];
  }

  const snapshots: Snapshot[] = [];
  for (const file of files.filter((f) => f.endsWith(".json"))) {
    try {
      const raw = await fs.readFile(path.join(SNAPSHOTS_DIR, file), "utf-8");
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
