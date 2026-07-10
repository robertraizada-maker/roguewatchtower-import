import { Tournament } from "../models/tournament";

export type TournamentUpsertResult = "inserted" | "updated";

export interface TournamentUpsertResponse {
	id: number;
	result: TournamentUpsertResult;
}

export async function upsertTournament(
	db: D1Database,
	importRunId: number,
	tournament: Tournament
): Promise<TournamentUpsertResponse> {
	const existing = await db
		.prepare(
			`SELECT id
			 FROM tournaments
			 WHERE limitless_id = ?`
		)
		.bind(tournament.id)
		.first<{ id: number }>();

	await db
		.prepare(
			`INSERT INTO tournaments
			(
				last_import_run_id,
				limitless_id,
				name,
				tournament_date,
				players,
				game,
				format,
				organizer_id
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(limitless_id) DO UPDATE SET
				last_import_run_id = excluded.last_import_run_id,
				name = excluded.name,
				tournament_date = excluded.tournament_date,
				players = excluded.players,
				game = excluded.game,
				format = excluded.format,
				organizer_id = excluded.organizer_id`
		)
		.bind(
			importRunId,
			tournament.id,
			tournament.name,
			tournament.date,
			tournament.players,
			tournament.game,
			tournament.format,
			tournament.organizerId
		)
		.run();

	const row = await db
		.prepare(
			`SELECT id
			 FROM tournaments
			 WHERE limitless_id = ?`
		)
		.bind(tournament.id)
		.first<{ id: number }>();

	if (!row) {
		throw new Error(`Failed to fetch tournament id: ${tournament.id}`);
	}

	return {
		id: row.id,
		result: existing ? "updated" : "inserted",
	};
}
