/**
 * Reads and writes snapshot JSON files.
 *
 * Vercel serverless: process.cwd() (/var/task) is read-only and /tmp is
 * wiped between invocations. To persist data we write latest.json back to
 * the GitHub repo via the Contents API so it is bundled into the next deploy.
 *
 * Set GITHUB_PAT (repo scope) in Vercel environment variables to enable
 * GitHub write-back. Without it the batch still runs but data won't persist.
 */

import fs from "fs/promises";
import path from "path";
import type { Snapshot } from "@/types";

const TMP_DIR = "/tmp/narrativedata";
const TMP_SNAPSHOTS_DIR = path.join(TMP_DIR, "snapshots");
const TMP_LATEST_PATH = path.join(TMP_DIR, "latest.json");
const BUNDLED_LATEST_PATH = path.join(process.cwd(), "data", "latest.json");

const GH_OWNER = "pokposu124";
const GH_REPO = "narrative";
const GH_FILE = "data/latest.json";
const GH_API = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE}`;

async function ensureSnapshotsDir() {
  await fs.mkdir(TMP_SNAPSHOTS_DIR, { recursive: true });
}

/** Push latest.json to the GitHub repo so it survives across invocations. */
async function writeToGitHub(content: string): Promise<void> {
  const token = process.env.GITHUB_PAT;
  if (!token) {
    console.warn("[data] GITHUB_PAT not set — skipping GitHub write-back");
    return;
  }

  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };

  // Need current file SHA to update (GitHub API requirement)
  let sha: string | undefined;
  try {
    const res = await fetch(GH_API, { headers });
    if (res.ok) {
      const json = await res.json() as { sha: string };
      sha = json.sha;
    }
  } catch {
    // ignore — PUT without SHA will create the file
  }

  const body: Record<string, string> = {
    message: "chore: update latest snapshot [skip ci]",
    content: Buffer.from(content).toString("base64"),
    branch: "main",
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(GH_API, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (putRes.ok) {
    console.log("[data] latest.json pushed to GitHub");
  } else {
    const err = await putRes.text();
    console.error("[data] GitHub write-back failed:", putRes.status, err);
  }
}

export async function readLatest(): Promise<Snapshot | null> {
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

  const json = JSON.stringify(snapshot, null, 2);
  const safeTs = snapshot.timestamp.replace(/[:.]/g, "-");
  const snapPath = path.join(TMP_SNAPSHOTS_DIR, `${safeTs}.json`);

  await fs.writeFile(snapPath, json, "utf-8");
  await fs.writeFile(TMP_LATEST_PATH, json, "utf-8");
  console.log(`[data] Snapshot written to /tmp: ${safeTs}.json`);

  // Persist to GitHub so it survives across invocations
  await writeToGitHub(json);
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
