import { ConvexHttpClient } from "convex/browser";
import { fetchOuraData } from "../src/lib/oura";
import { anyApi } from "convex/server";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!url) {
    console.error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local");
    process.exit(1);
}

const client = new ConvexHttpClient(url);

async function main() {
    console.log("\\n--- Syncing latest Oura Data to Convex ---");

    // Sync the last 7 days to keep it fast but capture any delayed Oura updates
    const date = new Date();
    date.setDate(date.getDate() - 7);
    const start_date = date.toISOString().split('T')[0];

    const ouraData = await fetchOuraData(start_date);
    let count = 0;

    for (const d of Object.keys(ouraData)) {
        await client.mutation(anyApi.oura.insertDay, {
            date: ouraData[d].date,
            readiness_score: ouraData[d].readiness_score,
            sleep_score: ouraData[d].sleep_score,
            activity_score: ouraData[d].activity_score,
            hrv_balance_score: ouraData[d].hrv_balance_score,
            heart_rate_data: ouraData[d].heart_rate_data,
            sleep_periods: ouraData[d].sleep_periods,
        });
        console.log(`✓ Synced ${d}`);
        count++;
    }

    console.log(`\\nSuccessfully synced ${count} days to Convex!`);
}

main().catch(console.error);
