import { env } from "cloudflare:test";
import { beforeEach, expect, it, vi } from "vitest";
import { StandingImporter } from "../src/importers/StandingImporter";
import { getTournamentStandings } from "../src/api/limitlessTournamentApi";
import { upsertTournament } from "../src/repositories/tournamentRepository";

vi.mock("../src/api/limitlessTournamentApi", () => ({ getTournamentStandings: vi.fn() }));
const source = (player: string, extra = {}) => ({
    player, name: player + " Display", country: "GB", placing: 1,
    record: { wins: 3, losses: 0, ties: 0 }, deck: { id: "deck", name: "Deck" }, ...extra,
});
beforeEach(async () => {
    await env.DB.exec("CREATE TABLE players (id INTEGER PRIMARY KEY, name TEXT UNIQUE, country TEXT, updated_at TEXT);");
    await env.DB.exec("CREATE TABLE tournament_standings (tournament_id INTEGER, player_id INTEGER, standing INTEGER, record_wins INTEGER, record_losses INTEGER, record_ties INTEGER, deck_limitless_id TEXT, deck_name TEXT, decklist_export TEXT, player_display_name TEXT, updated_at TEXT, UNIQUE(tournament_id,player_id));");
    vi.clearAllMocks();
});
it("leaves unchanged players and results untouched, adds missing results, and fills late placing/decklists", async () => {
    const importer = new StandingImporter(env.DB);
    vi.mocked(getTournamentStandings).mockResolvedValue([source("same"), source("late", { placing: null })]);
    await importer.importForTournament(1, "event");
    await env.DB.exec("UPDATE tournament_standings SET updated_at = 'morning'; UPDATE players SET updated_at = 'morning';");
    vi.mocked(getTournamentStandings).mockResolvedValue([
        source("same"), source("late", { placing: 2, decklist: { pokemon: [{ count: 4, name: "Pikachu", set: "ABC", number: "1" }] } }), source("new"),
    ]);
    const changed = await importer.importForTournament(1, "event", true);
    expect(changed.map(row => row.standing.player.name)).toEqual(["late", "new"]);
    const unchanged = await env.DB.prepare("SELECT ts.updated_at AS standing_time, p.updated_at AS player_time FROM tournament_standings ts JOIN players p ON p.id=ts.player_id WHERE p.name='same'").first();
    expect(unchanged).toEqual({ standing_time: "morning", player_time: "morning" });
    const late = await env.DB.prepare("SELECT standing, decklist_export FROM tournament_standings ts JOIN players p ON p.id=ts.player_id WHERE p.name='late'").first<{ standing: number; decklist_export: string }>();
    expect(late?.standing).toBe(2);
    expect(late?.decklist_export).toContain("4 Pikachu ABC 1");
    expect(await importer.importForTournament(1, "event", true)).toEqual([]);
});
it("retries a tournament whose earlier import wrote no standings", async () => {
    vi.mocked(getTournamentStandings).mockResolvedValue([source("new")]);
    expect(await new StandingImporter(env.DB).importForTournament(1, "event", true)).toHaveLength(1);
});
it("does not confuse the same player's results in different tournaments", async () => {
    vi.mocked(getTournamentStandings).mockResolvedValue([source("same")]);
    const importer = new StandingImporter(env.DB);
    await importer.importForTournament(1, "first");
    expect(await importer.importForTournament(2, "second", true)).toHaveLength(1);
});
it("skips unchanged tournament writes but accepts new tournaments and changed metadata", async () => {
    await env.DB.exec("CREATE TABLE tournaments (id INTEGER PRIMARY KEY, limitless_id TEXT UNIQUE, last_import_run_id INTEGER, name TEXT, tournament_date TEXT, players INTEGER, game TEXT, format TEXT, organizer_id INTEGER);");
    const tournament = { id: "event", name: "Event", date: "2026-09-05", players: 32, game: "PTCG", format: "STANDARD", organizerId: 1 };
    expect((await upsertTournament(env.DB, 1, tournament, true)).result).toBe("inserted");
    expect((await upsertTournament(env.DB, 2, tournament, true)).result).toBe("unchanged");
    expect(await env.DB.prepare("SELECT last_import_run_id FROM tournaments").first("last_import_run_id")).toBe(1);
    expect((await upsertTournament(env.DB, 2, { ...tournament, players: 40 }, true)).result).toBe("updated");
});
