# Training Health Dashboard

Next.js dashboard for combining training logs with Oura metrics.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Add your Oura token to `.env.local`:
   ```bash
   OURA_ACCESS_TOKEN=your_token_here
   ```
3. Run a first Oura sync (required before dashboard data appears):
   ```bash
   npm run oura:sync
   ```
4. Start the app:
   ```bash
   npm run dev
   ```

## Manual Oura sync (local files)

This project now uses a **manual local sync layer**. The dashboard does **not** call the live Oura API at runtime.

### First sync

```bash
npm run oura:sync
```

Defaults:
- `--start`: 90 days ago
- `--end`: today

### Re-sync a specific date range

```bash
npm run oura:sync -- --start=2025-12-01 --end=2026-03-01
```

### Synced file locations

- Raw endpoint payloads:
  - `data/oura/raw/daily_readiness.json`
  - `data/oura/raw/daily_sleep.json`
  - `data/oura/raw/daily_activity.json`
  - `data/oura/raw/heartrate.json`
  - `data/oura/raw/daily_stress.json`
  - `data/oura/raw/workout.json`
  - `data/oura/raw/session.json`
  - `data/oura/raw/daily_spo2.json`
  - `data/oura/raw/tag.json`
  - `data/oura/raw/personal_info.json`
- Sync metadata summary:
  - `data/oura/meta/sync-summary.json`

`sync-summary.json` contains `synced_at`, requested date range, and record counts per endpoint.

## Notes

- If required local files are missing, the app will log a warning and return empty Oura data.
- Re-run `npm run oura:sync` whenever you want fresher Oura data.
