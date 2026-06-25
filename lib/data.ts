/**
 * Reads and writes snapshot JSON files.
 *
 * Vercel serverless: /tmp is wiped between invocations.
 * We persist data by writing latest.json and history.json back to GitHub via the Contents API.
 * Set GITHUB_PAT (classic token, repo scope) in Vercel environment variables.
 */

import fs from "fs/promises";
import path from "path";
import type { Snapshot } from "@/types";

const TMP_DIR = "/tmp/narrativedata";
const TMP_SNAPSHOTS_DIR = path.join(TMP_DIR, "snapshots");
const TMP_LATEST_PATH = path.join(TMP_DIR, "latest.json");
const BUNDLED_LATEST_PATH = path.join(process.cwd(), "data", "latest.json");
const BUNDLED_HISTORY_PATH = path.join(process.cwd(), "data", "history.json");

const GH_OWNER = "pokposu124";
const GH_REPO = "narrative";
const GH_LATEST_FILE = "data/latest.json";
const GH_HISTORY_FILE = "data/history.json";
const GH_API_BASE = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents`;

type HistoryEntry = { timestamp: string; scores: Record<string, number> };

async function ensureSnapshotsDir() {
  await fs.mkdir(TMP_SNAPSHOTS_DIR, { recursive: true });
}

function ghHeaders(token: string) {
  return {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
}

async function ghGet(url: string, token: string) {
  const res = await fetch(url, { headers: ghHeaders(token), cache: "no-store" });
  if (!res.ok) return null;
  return res.json() as Promise<{ sha: string; content: string }>;
}

async function ghPut(url: string, token: string, content: string, sha: string | undefined, message: string) {
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString("base64"),
    branch: "main",
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: ghHeaders(token),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (res.ok) return "ok";
  const err = await res.text();
  return `PUT failed: ${res.status} ${err.slice(0, 200)}`;
}

export async function writeToGitHub(content: string): Promise<string> {
  const token = process.env.GITHUB_PAT;
  if (!token) return "GITHUB_PAT not set";
  try {
    const url = `${GH_API_BASE}/${GH_LATEST_FILE}`;
    const current = await ghGet(url, token);
    return ghPut(url, token, content, current?.sha, "chore: update latest snapshot");
  } catch (err) {
    return `error: ${String(err)}`;
  }
}

async function appendHistoryToGitHub(entry: HistoryEntry): Promise<string> {
  const token = process.env.GITHUB_PAT;
  if (!token) return "GITHUB_PAT not set";
  try {
    const url = `${GH_API_BASE}/${GH_HISTORY_FILE}`;
    const current = await ghGet(url, token);

    let history: HistoryEntry[] = [];
    if (current?.content) {
      try {
        history = JSON.parse(Buffer.from(current.content, "base64").toString("utf-8"));
      } catch {
        history = [];
      }
    }

    // Deduplicate by timestamp, append new entry, keep last 400 entries (~100 days at 4/day)
    history = history.filter((h) => h.timestamp !== entry.timestamp);
    history.push(entry);
    if (history.length > 400) history = history.slice(-400);
    history.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return ghPut(url, token, JSON.stringify(history, null, 2), current?.sha, "chore: update score history");
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
  console.log("[data] GitHub latest write-back:", ghStatus);

  const entry: HistoryEntry = {
    timestamp: snapshot.timestamp,
    scores: Object.fromEntries(snapshot.themes.map((t) => [t.id, t.totalScore])),
  };
  const histStatus = await appendHistoryToGitHub(entry);
  console.log("[data] GitHub history write-back:", histStatus);

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
      const raw = await fs.readFile(path.join(TMP_SNAPSHOTS_DIR, file), "utf-8");
      snapshots.push(JSON.parse(raw));
    } catch {
      // skip
    }
  }

  snapshots.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return snapshots;
}

export async function readScoreHistory(): Promise<HistoryEntry[]> {
  // Primary: bundled data/history.json (updated on each cron run via GitHub write-back)
  try {
    const raw = await fs.readFile(BUNDLED_HISTORY_PATH, "utf-8");
    const history: HistoryEntry[] = JSON.parse(raw);
    if (Array.isArray(history) && history.length > 0) return history;
  } catch {
    // fall through
  }

  // Fallback: /tmp snapshots accumulated in the current function lifetime
  const all = await readAllSnapshots();
  return all.map((s) => ({
    timestamp: s.timestamp,
    scores: Object.fromEntries(s.themes.map((t) => [t.id, t.totalScore])),
  }));
}
