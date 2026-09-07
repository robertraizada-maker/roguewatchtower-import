import type { Standing } from "../models/standing";
import { buildDecklistExport } from "../utils/buildDecklistExport";

interface StoredStanding {
    name: string;
    country: string | null;
    player_display_name: string | null;
    standing: number | null;
    record_wins: number;
    record_losses: number;
    record_ties: number;
    deck_limitless_id: string | null;
    deck_name: string | null;
    decklist_export: string | null;
}

export async function getChangedStandings(db: D1Database, tournamentId: number, standings: Standing[]) {
    const result = await db.prepare(`SELECT p.name, p.country, ts.player_display_name,
        ts.standing, ts.record_wins, ts.record_losses, ts.record_ties,
        ts.deck_limitless_id, ts.deck_name, ts.decklist_export
        FROM tournament_standings ts INNER JOIN players p ON p.id = ts.player_id
        WHERE ts.tournament_id = ?`).bind(tournamentId).all<StoredStanding>();
    const existing = new Map(result.results.map((row) => [row.name, row]));
    return standings.filter((standing) => {
        const row = existing.get(standing.player.name);
        return !row || row.country !== standing.player.country ||
            row.player_display_name !== standing.player.displayName ||
            row.standing !== standing.placing || row.record_wins !== standing.wins ||
            row.record_losses !== standing.losses || row.record_ties !== standing.ties ||
            row.deck_limitless_id !== standing.deck.limitlessId || row.deck_name !== standing.deck.name ||
            (row.decklist_export ?? "") !== buildDecklistExport(standing.decklist);
    });
}
