import { getTopRogueDecksForDate } from "./metaRepository";

export async function getRankingSnapshot(db: D1Database, reportDate: string) {
    const row = await db.prepare(
        "SELECT decks_json, calculated_at FROM ranking_snapshots WHERE report_date = ?"
    ).bind(reportDate).first<{ decks_json: string; calculated_at: string }>();
    return row ? { rogueDecks: JSON.parse(row.decks_json) as any[], calculatedAt: row.calculated_at } : null;
}

export async function refreshRankingSnapshot(db: D1Database, reportDate: string) {
    const rogueDecks = await getTopRogueDecksForDate(db, reportDate);
    // Publish only after success; failed refreshes retain the last snapshot.
    await db.prepare(`INSERT INTO ranking_snapshots (report_date, decks_json, calculated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(report_date) DO UPDATE SET
            decks_json = excluded.decks_json, calculated_at = excluded.calculated_at`
    ).bind(reportDate, JSON.stringify(rogueDecks)).run();
    return rogueDecks;
}

export async function refreshRankingsAfterImport(db: D1Database, reportDate: string) {
    await refreshRankingSnapshot(db, reportDate);
    await refreshLaterRankings(db, reportDate);
}

// Historical corrections also affect the meta window of later saved reports.
export async function refreshLaterRankings(db: D1Database, reportDate: string) {
    const dates = await db.prepare(`SELECT report_date FROM ranking_snapshots
        WHERE report_date > ? AND report_date <= DATE(?, '+28 days')
        ORDER BY report_date`
    ).bind(reportDate, reportDate).all<{ report_date: string }>();
    for (const row of dates.results) await refreshRankingSnapshot(db, row.report_date);
}
