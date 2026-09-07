import { Player } from "../models/player";

export async function upsertPlayer(
	db: D1Database,
	player: Player
): Promise<number> {
	const id = (await upsertPlayers(db, [player])).get(player.name);
	if (id === undefined) throw new Error('Failed to upsert player');
	return id;
}

export async function upsertPlayers(
	db: D1Database,
	players: Player[]
): Promise<Map<string, number>> {
	const uniquePlayers = new Map<string, Player>();

	for (const player of players) {
		uniquePlayers.set(player.name, player);
	}

	// Look up existing identities in bounded batches before writing. A changed
	// result or a new tournament does not imply that the player changed.
	const playerIds = new Map<string, number>();
	const changedPlayers: Player[] = [];
	const unique = Array.from(uniquePlayers.values());
	for (let offset = 0; offset < unique.length; offset += 90) {
		const chunk = unique.slice(offset, offset + 90);
		const rows = await db.prepare(
			'SELECT id, name, country FROM players WHERE name IN (' + chunk.map(() => '?').join(',') + ')'
		).bind(...chunk.map(player => player.name)).all<{ id: number; name: string; country: string | null }>();
		const existing = new Map(rows.results.map(row => [row.name, row]));
		for (const player of chunk) {
			const row = existing.get(player.name);
			if (row) playerIds.set(player.name, row.id);
			if (!row || row.country !== player.country) changedPlayers.push(player);
		}
	}
	if (changedPlayers.length === 0) return playerIds;

	const statements = changedPlayers.map((player) =>
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


	for (const result of results) {
		const row = result.results?.[0];

		if (row) {
			playerIds.set(row.name, row.id);
		}
	}

	return playerIds;
}
