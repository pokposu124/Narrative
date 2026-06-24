/**
 * Reads and writes snapshot JSON files.
 *
 * Vercel serverless: /tmp is wiped between invocations.
 * We persist data by writing latest.json back to GitHub via the Contents API.
 * Set GITHUB_PAT (classic token, repo scope) in Vercel environment variables.
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

/**
 * Push latest.json to GitHub so Vercel redeploys with fresh bundled data.
 * Returns a status string for diagnostics.
 */
export async function writeToGitHub(content: string): Promise<string> {
  const token = process.env.GITHUB_PAT;
  if (!token) {
    return "GITHUB_PAT not set";
  }

  try {
    const headers = {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };

    // Get current file SHA (required by GitHub API for updates)
    let sha: string | undefined;
    const getRes = await fetch(GH_API, { headers, cache: "no-store" });
    if (getRes.ok) {
      const json = (await getRes.json()) as { sha: string };
      sha = json.sha;
    } else {
      const errText = await getRes.text();
      return `GET failed: ${getRes.status} ${errText.slice(0, 200)}`;
    }

    const body: Record<string, string> = {
      message: "chore: update latest snapshot",
      content: Buffer.from(content).toString("base64"),
      branch: "main",
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(GH_API, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (putRes.ok) {
      return "ok";
    } else {
      const err = await putRes.text();
      return `PUT failed: ${putRes.status} ${err.slice(0, 200)}`;
    }
  } catch (err) {
    return `error: ${String(err)}`;
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

export async function writeSnapshot(snapshot: Snapshot): Promise<string> {
  await ensureSnapshotsDir();

  const json = JSON.stringify(snapshot, null, 2);
  const safeTs = snapshot.timestamp.replace(/[:.]/g, "-");
  const snapPath = path.join(TMP_SNAPSHOTS_DIR, `${safeTs}.json`);

  await fs.writeFile(snapPath, json, "utf-8");
  await fs.writeFile(TMP_LATEST_PATH, json, "utf-8");

  const ghStatus = await writeToGitHub(json);
  console.log("[data] GitHub write-back:", ghStatus);
  return ghStatus;
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
      const raw = await fs.readFile(
        path.join(TMP_SNAPSHOTS_DIR, file),
        "utf-8"
      );
      snapshots.push(JSON.parse(raw));
    } catch {
      // skip
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
