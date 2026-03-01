#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OURA_API_BASE = "https://api.ouraring.com/v2/usercollection";
const ENDPOINTS = [
  "daily_readiness",
  "daily_sleep",
  "daily_activity",
  "heartrate",
  "daily_stress",
  "workout",
  "session",
  "daily_spo2",
  "tag",
  "personal_info",
];

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseArgs(argv) {
  let start;
  let end;

  for (const arg of argv) {
    if (arg.startsWith("--start=")) {
      start = arg.slice("--start=".length).trim();
      continue;
    }

    if (arg.startsWith("--end=")) {
      end = arg.slice("--end=".length).trim();
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "Manual Oura sync",
          "",
          "Usage:",
          "  node scripts/sync-oura.mjs [--start=YYYY-MM-DD] [--end=YYYY-MM-DD]",
          "",
          "Defaults:",
          "  --start: 90 days ago",
          "  --end:   today",
        ].join("\n"),
      );
      process.exit(0);
    }
  }

  const today = new Date();
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(today.getDate() - 90);

  return {
    start: start || formatDate(ninetyDaysAgo),
    end: end || formatDate(today),
  };
}

function ensureValidDate(label, value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be YYYY-MM-DD. Received: ${value}`);
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} is not a valid date: ${value}`);
  }
}

async function loadEnvLocal(envPath) {
  const file = await readFile(envPath, "utf8");
  const vars = {};

  for (const rawLine of file.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    vars[key] = value;
  }

  return vars;
}

function countRecords(payload) {
  if (Array.isArray(payload)) {
    return payload.length;
  }

  if (payload && typeof payload === "object") {
    const obj = payload;
    if (Array.isArray(obj.data)) {
      return obj.data.length;
    }

    return Object.keys(obj).length > 0 ? 1 : 0;
  }

  return 0;
}

function supportsDateRange(endpoint) {
  return endpoint !== "personal_info";
}

function supportsPagination(endpoint) {
  return endpoint !== "personal_info";
}

async function fetchEndpoint(endpoint, token, range) {
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const pages = [];
  const mergedData = [];

  let nextToken = null;

  do {
    const url = new URL(`${OURA_API_BASE}/${endpoint}`);

    if (supportsDateRange(endpoint)) {
      url.searchParams.set("start_date", range.start_date);
      url.searchParams.set("end_date", range.end_date);
    }

    if (nextToken) {
      url.searchParams.set("next_token", nextToken);
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Failed ${endpoint} (${response.status} ${response.statusText}): ${responseText.slice(0, 500)}`,
      );
    }

    const payload = await response.json();
    pages.push(payload);

    if (Array.isArray(payload?.data)) {
      mergedData.push(...payload.data);
    }

    const receivedNextToken =
      typeof payload?.next_token === "string" && payload.next_token.length > 0
        ? payload.next_token
        : null;

    nextToken = supportsPagination(endpoint) ? receivedNextToken : null;
  } while (nextToken);

  if (mergedData.length > 0 || (pages[0] && Array.isArray(pages[0].data))) {
    const normalized = { data: mergedData };
    return {
      payload: normalized,
      count: mergedData.length,
      pageCount: pages.length,
    };
  }

  const firstPage = pages[0] ?? {};
  return {
    payload: firstPage,
    count: countRecords(firstPage),
    pageCount: pages.length,
  };
}

async function main() {
  const projectRoot = process.cwd();
  const envPath = path.join(projectRoot, ".env.local");

  const args = parseArgs(process.argv.slice(2));
  ensureValidDate("--start", args.start);
  ensureValidDate("--end", args.end);

  if (args.start > args.end) {
    throw new Error(`--start (${args.start}) must be on or before --end (${args.end}).`);
  }

  let envVars = {};
  try {
    envVars = await loadEnvLocal(envPath);
  } catch (error) {
    throw new Error(`Unable to read .env.local at ${envPath}. ${String(error)}`);
  }

  const token = envVars.OURA_ACCESS_TOKEN || process.env.OURA_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Missing OURA_ACCESS_TOKEN. Add it to .env.local.");
  }

  const rawDir = path.join(projectRoot, "data", "oura", "raw");
  const metaDir = path.join(projectRoot, "data", "oura", "meta");
  await mkdir(rawDir, { recursive: true });
  await mkdir(metaDir, { recursive: true });

  const counts = {};

  for (const endpoint of ENDPOINTS) {
    console.log(`[oura:sync] Syncing ${endpoint}...`);

    const { payload, count, pageCount } = await fetchEndpoint(endpoint, token, {
      start_date: args.start,
      end_date: args.end,
    });

    const outPath = path.join(rawDir, `${endpoint}.json`);
    await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

    counts[endpoint] = count;

    console.log(
      `[oura:sync] Saved ${endpoint}: ${count} records (${pageCount} page${pageCount === 1 ? "" : "s"}).`,
    );
  }

  const summary = {
    synced_at: new Date().toISOString(),
    range: {
      start_date: args.start,
      end_date: args.end,
    },
    counts,
  };

  const summaryPath = path.join(metaDir, "sync-summary.json");
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(`[oura:sync] Wrote summary to ${summaryPath}`);
}

main().catch((error) => {
  console.error(`[oura:sync] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
