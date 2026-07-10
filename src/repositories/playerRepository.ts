import { Player } from "../models/player";

export async function upsertPlayer(
	db: D1Database,
	player: Player
): Promise<number> {
	const result = await db
		.prepare(
			`INSERT INTO players (
				name,
				country,
				updated_at
			)
			VALUES (?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(name) DO UPDATE SET
				country = excluded.country,
				updated_at = CURRENT_TIMESTAMP
			RETURNING id`
		)
		.bind(player.name, player.country)
		.first<{ id: number }>();

	if (!result) {
		throw new Error(`Failed to upsert player: ${player.name}`);
	}

	return result.id;
}
