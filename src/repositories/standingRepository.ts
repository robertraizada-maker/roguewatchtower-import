export async function upsertStanding(
	db: D1Database,
	tournamentId: number,
	playerId: number,
	placing: number | null,
	wins: number,
	losses: number,
	ties: number,
	deckLimitlessId: string,
	deckName: string,
	decklistExport: string
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO tournament_standings (
				tournament_id,
				player_id,
				standing,
				record_wins,
				record_losses,
				record_ties,
				deck_limitless_id,
				deck_name,
				decklist_export,
				updated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(tournament_id, player_id) DO UPDATE SET
				standing = excluded.standing,
				record_wins = excluded.record_wins,
				record_losses = excluded.record_losses,
				record_ties = excluded.record_ties,
				deck_limitless_id = excluded.deck_limitless_id,
				deck_name = excluded.deck_name,
				decklist_export = excluded.decklist_export,
				updated_at = CURRENT_TIMESTAMP`
		)
		.bind(
			tournamentId,
			playerId,
			placing,
			wins,
			losses,
			ties,
			deckLimitlessId,
			deckName,
			decklistExport
		)
		.run();
}

export interface StandingUpsert {
	tournamentId: number;
	playerId: number;
	placing: number | null;
	wins: number;
	losses: number;
	ties: number;
	deckLimitlessId: string;
	deckName: string;
	decklistExport: string;
}

export async function upsertStandings(
	db: D1Database,
	standings: StandingUpsert[]
): Promise<void> {
	if (standings.length === 0) {
		return;
	}

	const statements = standings.map((standing) =>
		db
			.prepare(
				`INSERT INTO tournament_standings (
					tournament_id,
					player_id,
					standing,
					record_wins,
					record_losses,
					record_ties,
					deck_limitless_id,
					deck_name,
					decklist_export,
					updated_at
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
				ON CONFLICT(tournament_id, player_id) DO UPDATE SET
					standing = excluded.standing,
					record_wins = excluded.record_wins,
					record_losses = excluded.record_losses,
					record_ties = excluded.record_ties,
					deck_limitless_id = excluded.deck_limitless_id,
					deck_name = excluded.deck_name,
					decklist_export = excluded.decklist_export,
					updated_at = CURRENT_TIMESTAMP`
			)
			.bind(
				standing.tournamentId,
				standing.playerId,
				standing.placing,
				standing.wins,
				standing.losses,
				standing.ties,
				standing.deckLimitlessId,
				standing.deckName,
				standing.decklistExport
			)
	);

	await db.batch(statements);
}
