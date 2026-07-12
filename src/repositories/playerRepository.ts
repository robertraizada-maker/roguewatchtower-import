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

export async function upsertPlayers(
	db: D1Database,
	players: Player[]
): Promise<Map<string, number>> {
	const uniquePlayers = new Map<string, Player>();

	for (const player of players) {
		uniquePlayers.set(player.name, player);
	}

	const statements = Array.from(uniquePlayers.values()).map((player) =>
		db
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
				RETURNING id, name`
			)
			.bind(player.name, player.country)
	);

	const results = await db.batch<{ id: number; name: string }>(statements);

	const playerIds = new Map<string, number>();

	for (const result of results) {
		const row = result.results?.[0];

		if (row) {
			playerIds.set(row.name, row.id);
		}
	}

	return playerIds;
}
