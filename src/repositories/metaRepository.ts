import { ROGUE_SETTINGS } from "../config";

export async function getTopRogueDecksForDate(
	db: D1Database,
	reportDate: string
): Promise<any[]> {
	return await db
		.prepare(
			`WITH meta_decks AS (
				SELECT
					ts.deck_name
				FROM tournament_standings ts
				INNER JOIN tournaments t
					ON ts.tournament_id = t.id
				WHERE ts.deck_name IS NOT NULL
				  AND ts.deck_name <> 'Unknown'
				  AND DATE(t.tournament_date) >= DATE(?, '-' || ? || ' days')
				  AND DATE(t.tournament_date) < DATE(?)
				GROUP BY ts.deck_name
				ORDER BY COUNT(*) DESC
				LIMIT ?
			),
			rogue_results AS (
				SELECT
					ts.tournament_id,
					ts.player_id,
					ts.deck_name,
					p.name AS player_name,
					t.name AS tournament_name,
					t.players AS tournament_players,
					ts.standing,
					ts.record_wins,
					ts.record_losses,
					ts.record_ties,
					ts.decklist_export,
					(ts.record_wins + ts.record_losses + ts.record_ties) AS rounds_played,
					ROUND((ts.standing * 100.0) / NULLIF(t.players, 0), 2) AS finish_percentage
				FROM tournament_standings ts
				INNER JOIN tournaments t
					ON ts.tournament_id = t.id
				INNER JOIN players p
					ON ts.player_id = p.id
				WHERE ts.deck_name IS NOT NULL
				  AND ts.deck_name <> 'Unknown'
				  AND ts.standing IS NOT NULL
				  AND DATE(t.tournament_date) = DATE(?)
				  AND ts.deck_name NOT IN (
					  SELECT deck_name FROM meta_decks
				  )
				  AND t.players >= 32
			),
			best_rogue_results AS (
				SELECT
					deck_name,
					MIN(finish_percentage) AS best_finish_percentage
				FROM rogue_results
				GROUP BY deck_name
			)
			SELECT
				rr.tournament_id,
				rr.player_id,
				rr.deck_name,
				rr.player_name,
				rr.tournament_name,
				rr.tournament_players,
				rr.standing,
				rr.record_wins AS wins,
				rr.record_losses AS losses,
				rr.record_ties AS ties,
				rr.rounds_played,
				rr.finish_percentage,
				rr.decklist_export
			FROM rogue_results rr
			INNER JOIN best_rogue_results brr
				ON rr.deck_name = brr.deck_name
			   AND rr.finish_percentage = brr.best_finish_percentage
			ORDER BY
				rr.finish_percentage ASC,
				rr.tournament_players DESC,
				rr.record_wins DESC,
				rr.standing ASC,
				rr.player_id ASC
			LIMIT ?`
		)
		.bind(
			reportDate,
			ROGUE_SETTINGS.metaWindowDays,
			reportDate,
			ROGUE_SETTINGS.metaDeckCount,
			reportDate,
			ROGUE_SETTINGS.rogueDeckCount
		)
		.all<any>()
		.then((result) => result.results ?? []);
}

export async function getAvailableMetaDates(
	db: D1Database
): Promise<string[]> {
	const result = await db
		.prepare(
			`SELECT DISTINCT
    report_date
FROM import_runs
WHERE status = 'Completed'
ORDER BY DATE(report_date) DESC
LIMIT 28`
		)
		.all<{ report_date: string }>();

	return (result.results ?? []).map((row) => row.report_date);
}
