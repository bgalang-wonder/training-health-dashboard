const OURA_API_URL = "https://api.ouraring.com/v2/usercollection";

export interface OuraDailySummary {
    date: string;
    readiness_score: number | null;
    sleep_score: number | null;
    activity_score: number | null;
    hrv_balance_score: number | null;
    heart_rate_data: { timestamp: string; bpm: number }[]; // Intraday 5-min intervals
}

export async function fetchOuraData(startDate: string): Promise<Record<string, OuraDailySummary>> {
    const token = process.env.OURA_ACCESS_TOKEN;
    if (!token) {
        console.error("No OURA_ACCESS_TOKEN found.");
        return {};
    }

    const headers = { Authorization: `Bearer ${token}` };
    const params = `?start_date=${startDate}`;

    try {
        const [readinessRes, sleepRes, activityRes, heartrateRes] = await Promise.all([
            fetch(`${OURA_API_URL}/daily_readiness${params}`, { headers, next: { revalidate: 3600 } }),
            fetch(`${OURA_API_URL}/daily_sleep${params}`, { headers, next: { revalidate: 3600 } }),
            fetch(`${OURA_API_URL}/daily_activity${params}`, { headers, next: { revalidate: 3600 } }),
            fetch(`${OURA_API_URL}/heartrate${params}`, { headers, next: { revalidate: 3600 } })
        ]);

        const readinessData = await readinessRes.json();
        const sleepData = await sleepRes.json();
        const activityData = await activityRes.json();
        const heartrateData = await heartrateRes.json();

        const summaries: Record<string, OuraDailySummary> = {};

        // Map Readiness
        if (readinessData.data) {
            readinessData.data.forEach((item: any) => {
                summaries[item.day] = {
                    date: item.day,
                    readiness_score: item.score,
                    hrv_balance_score: item.contributors?.hrv_balance || null,
                    sleep_score: null,
                    activity_score: null,
                    heart_rate_data: []
                };
            });
        }

        // Map Sleep
        if (sleepData.data) {
            sleepData.data.forEach((item: any) => {
                if (!summaries[item.day]) summaries[item.day] = { date: item.day, readiness_score: null, hrv_balance_score: null, sleep_score: null, activity_score: null, heart_rate_data: [] };
                summaries[item.day].sleep_score = item.score;
            });
        }

        // Map Activity
        if (activityData.data) {
            activityData.data.forEach((item: any) => {
                if (!summaries[item.day]) summaries[item.day] = { date: item.day, readiness_score: null, hrv_balance_score: null, sleep_score: null, activity_score: null, heart_rate_data: [] };
                summaries[item.day].activity_score = item.score;
            });
        }

        // Map Intraday Heart Rate
        if (heartrateData.data) {
            heartrateData.data.forEach((item: any) => {
                // item.timestamp looks like "2026-02-25T08:05:00+00:00"
                const dayStr = item.timestamp.split('T')[0];
                if (!summaries[dayStr]) {
                    summaries[dayStr] = { date: dayStr, readiness_score: null, hrv_balance_score: null, sleep_score: null, activity_score: null, heart_rate_data: [] };
                }
                summaries[dayStr].heart_rate_data.push({
                    timestamp: item.timestamp,
                    bpm: item.bpm
                });
            });
        }

        return summaries;
    } catch (error) {
        console.error("Error fetching Oura data:", error);
        return {};
    }
}
