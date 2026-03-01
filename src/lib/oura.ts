import { readFile } from "node:fs/promises";
import path from "node:path";

const OURA_RAW_DIR = path.join(process.cwd(), "data", "oura", "raw");

export interface OuraDailySummary {
  date: string;
  readiness_score: number | null;
  sleep_score: number | null;
  activity_score: number | null;
  hrv_balance_score: number | null;
  heart_rate_data: { timestamp: string; bpm: number }[];
}

type OuraReadinessRecord = {
  day?: string;
  score?: number | null;
  contributors?: {
    hrv_balance?: number | null;
  };
};

type OuraScoreRecord = {
  day?: string;
  score?: number | null;
};

type OuraHeartRateRecord = {
  timestamp?: string;
  bpm?: number | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractDataArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!isObject(payload)) {
    return [];
  }

  if (Array.isArray(payload.data)) {
    return payload.data as T[];
  }

  if (Array.isArray(payload.pages)) {
    return payload.pages.flatMap((page) => extractDataArray<T>(page));
  }

  return [];
}

async function readLocalEndpoint(endpoint: string): Promise<unknown | null> {
  const filePath = path.join(OURA_RAW_DIR, `${endpoint}.json`);

  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as unknown;
  } catch (error) {
    if (isObject(error) && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function createEmptySummary(date: string): OuraDailySummary {
  return {
    date,
    readiness_score: null,
    sleep_score: null,
    activity_score: null,
    hrv_balance_score: null,
    heart_rate_data: [],
  };
}

export async function fetchOuraData(startDate: string): Promise<Record<string, OuraDailySummary>> {
  const requiredEndpoints = ["daily_readiness", "daily_sleep", "daily_activity", "heartrate"] as const;

  try {
    const payloads = await Promise.all(requiredEndpoints.map((endpoint) => readLocalEndpoint(endpoint)));

    const missing = requiredEndpoints.filter((endpoint, index) => payloads[index] === null);
    if (missing.length > 0) {
      console.warn(
        `[oura] Missing local sync files: ${missing
          .map((endpoint) => `data/oura/raw/${endpoint}.json`)
          .join(", ")}. Run \"npm run oura:sync\" first.`,
      );
      return {};
    }

    const [readinessPayload, sleepPayload, activityPayload, heartratePayload] = payloads;

    const readinessData = extractDataArray<OuraReadinessRecord>(readinessPayload);
    const sleepData = extractDataArray<OuraScoreRecord>(sleepPayload);
    const activityData = extractDataArray<OuraScoreRecord>(activityPayload);
    const heartrateData = extractDataArray<OuraHeartRateRecord>(heartratePayload);

    const summaries: Record<string, OuraDailySummary> = {};

    const ensureDay = (day: string): OuraDailySummary => {
      if (!summaries[day]) {
        summaries[day] = createEmptySummary(day);
      }
      return summaries[day];
    };

    for (const item of readinessData) {
      if (!item.day || item.day < startDate) {
        continue;
      }

      const summary = ensureDay(item.day);
      summary.readiness_score = typeof item.score === "number" ? item.score : null;

      const hrvBalance = item.contributors?.hrv_balance;
      summary.hrv_balance_score = typeof hrvBalance === "number" ? hrvBalance : null;
    }

    for (const item of sleepData) {
      if (!item.day || item.day < startDate) {
        continue;
      }

      const summary = ensureDay(item.day);
      summary.sleep_score = typeof item.score === "number" ? item.score : null;
    }

    for (const item of activityData) {
      if (!item.day || item.day < startDate) {
        continue;
      }

      const summary = ensureDay(item.day);
      summary.activity_score = typeof item.score === "number" ? item.score : null;
    }

    for (const item of heartrateData) {
      if (!item.timestamp || !item.timestamp.includes("T")) {
        continue;
      }

      const day = item.timestamp.split("T")[0];
      if (day < startDate) {
        continue;
      }

      if (typeof item.bpm !== "number") {
        continue;
      }

      const summary = ensureDay(day);
      summary.heart_rate_data.push({
        timestamp: item.timestamp,
        bpm: item.bpm,
      });
    }

    return summaries;
  } catch (error) {
    console.error("[oura] Error reading local Oura data:", error);
    return {};
  }
}
