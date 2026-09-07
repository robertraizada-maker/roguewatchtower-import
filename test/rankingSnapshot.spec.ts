import snapshotSchema from "../database/013_add_ranking_snapshots.sql?raw";
import { env, createExecutionContext } from "cloudflare:test";
import { beforeEach, expect, it, vi } from "vitest";
import { getRankingSnapshot, refreshRankingSnapshot, refreshLaterRankings } from "../src/repositories/rankingSnapshotRepository";
import { getTopRogueDecksForDate } from "../src/repositories/metaRepository";
import worker from "../src/index";

vi.mock("../src/repositories/metaRepository", () => ({ getTopRogueDecksForDate: vi.fn(), getAvailableMetaDates: vi.fn() }));
beforeEach(async () => {
    await env.DB.exec(snapshotSchema.replace(/\n/g, " "));
    vi.resetAllMocks();
});
it("serves saved rankings repeatedly without recalculating, including an empty top five", async () => {
    vi.mocked(getTopRogueDecksForDate).mockResolvedValue([{ player_id: 42 }]);
    await refreshRankingSnapshot(env.DB, "2026-09-05");
    vi.mocked(getTopRogueDecksForDate).mockResolvedValue([]);
    await refreshRankingSnapshot(env.DB, "2026-09-04");
    vi.mocked(getTopRogueDecksForDate).mockClear();
    for (const date of ["2026-09-05", "2026-09-05", "2026-09-04"]) {
        const response = await worker.fetch(new Request("https://example.com/meta/rogue?date=" + date), env, createExecutionContext());
        expect(response.status).toBe(200);
        expect((await response.json<{ rogueDecks: unknown[] }>()).rogueDecks).toEqual(date.endsWith("05") ? [{ player_id: 42 }] : []);
    }
    expect(getTopRogueDecksForDate).not.toHaveBeenCalled();
});
it("does not run an expensive query or claim an empty ranking when a snapshot is missing", async () => {
    const response = await worker.fetch(new Request("https://example.com/meta/rogue?date=2026-09-05"), env, createExecutionContext());
    expect(response.status).toBe(503);
    expect(getTopRogueDecksForDate).not.toHaveBeenCalled();
});
it("replaces a saved ranking after success and retains it if calculation fails", async () => {
    vi.mocked(getTopRogueDecksForDate).mockResolvedValue([{ player_id: 1 }]);
    await refreshRankingSnapshot(env.DB, "2026-09-05");
    vi.mocked(getTopRogueDecksForDate).mockResolvedValue([{ player_id: 2 }]);
    await refreshRankingSnapshot(env.DB, "2026-09-05");
    vi.mocked(getTopRogueDecksForDate).mockRejectedValue(new Error("Database unavailable"));
    await expect(refreshRankingSnapshot(env.DB, "2026-09-05")).rejects.toThrow("Database unavailable");
    expect((await getRankingSnapshot(env.DB, "2026-09-05"))?.rogueDecks).toEqual([{ player_id: 2 }]);
});
it("historical corrections refresh only saved reports in the following 28 days", async () => {
    for (const date of ["2026-08-07", "2026-08-08", "2026-08-09", "2026-09-05", "2026-09-06"]) {
        await env.DB.prepare("INSERT INTO ranking_snapshots (report_date, decks_json) VALUES (?, '[]')").bind(date).run();
    }
    vi.mocked(getTopRogueDecksForDate).mockResolvedValue([]);
    await refreshLaterRankings(env.DB, "2026-08-08");
    expect(vi.mocked(getTopRogueDecksForDate).mock.calls.map(call => call[1])).toEqual(["2026-08-09", "2026-09-05"]);
});

it("the snapshot migration can safely run again", async () => {
    await env.DB.prepare("INSERT INTO ranking_snapshots (report_date, decks_json) VALUES ('2026-09-05', '[]')").run();
    await env.DB.exec(snapshotSchema.replace(/\n/g, " "));
    expect((await getRankingSnapshot(env.DB, "2026-09-05"))?.rogueDecks).toEqual([]);
});
