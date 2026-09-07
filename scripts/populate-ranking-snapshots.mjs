// Run once after deploying the snapshot migration and worker. Safe to resume.
const base = process.env.API_BASE_URL;
const token = process.env.ADMIN_API_TOKEN;
if (!base || !token) throw new Error("Set API_BASE_URL and ADMIN_API_TOKEN in your environment.");
const origin = new URL(base);
if (origin.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(origin.hostname)) {
    throw new Error("Use HTTPS for the API.");
}
const request = async (path, init) => {
    const response = await fetch(new URL(path, origin), { ...init, redirect: "error" });
    if (!response.ok) throw new Error(path + " failed with HTTP " + response.status + ". Stop and check the API before retrying.");
    const body = await response.json();
    if (body.success !== true) throw new Error(path + " did not succeed.");
    return body;
};
const { dates } = await request("/meta/available-dates");
if (!Array.isArray(dates) || dates.some(date => typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    throw new Error("API returned invalid report dates.");
}
for (const date of [...new Set(dates)].sort()) {
    const existing = await fetch(new URL("/meta/rogue?date=" + date, origin), { redirect: "error" });
    if (existing.ok) {
        console.log(date + ": snapshot already exists");
        continue;
    }
    const body = await existing.json();
    if (existing.status !== 503 || body.message !== "Ranking has not been calculated for this date.") {
        throw new Error(date + ": cannot check the saved ranking (HTTP " + existing.status + ").");
    }
    await request("/admin/deck-of-the-day/repopulate", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ date, redeploy: false }),
    });
    console.log(date + ": snapshot saved");
}
console.log("Historical snapshots are ready. Rebuild the website once to publish them.");
