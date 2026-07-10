import { Deck } from "../models/deck";

export async function upsertPlayerDeck(
	db: D1Database,
	tournamentId: number,
	playerId: number,
	deck: Deck
): Promise<number> {
	const result = await db
		.prepare(
			`INSERT INTO decklists (
				tournament_id,
				player_id,
				limitless_decklist_id,
				archetype,
				updated_at
			)
			VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(tournament_id, player_id) DO UPDATE SET
				limitless_decklist_id = excluded.limitless_decklist_id,
				archetype = excluded.archetype,
				updated_at = CURRENT_TIMESTAMP
			RETURNING id`
		)
		.bind(
			tournamentId,
			playerId,
			deck.limitlessId,
			deck.name
		)
		.first<{ id: number }>();

	if (!result) {
		throw new Error(`Failed to upsert player deck for player ${playerId}`);
	}

	return result.id;
}
