import { getTournamentStandings } from "../api/limitlessTournamentApi";
import { parseStanding } from "../parsers/standingParser";
import { upsertPlayer } from "../repositories/playerRepository";
import { upsertStanding } from "../repositories/standingRepository";
import { PlayerDeckImporter } from "./PlayerDeckImporter";
import { IMPORT_SETTINGS } from "../config";

export class StandingImporter {
	constructor(private db: D1Database) { }

	async importForTournament(
		tournamentId: number,
		limitlessTournamentId: string
	): Promise<void> {

		const standings =
			await getTournamentStandings(limitlessTournamentId);

		const playerDeckImporter = IMPORT_SETTINGS.importCards
			? new PlayerDeckImporter(this.db)
			: null;

		for (const standingJson of standings) {

			const standing = parseStanding(standingJson);

			const playerId = await upsertPlayer(
				this.db,
				standing.player
			);

			await upsertStanding(
				this.db,
				tournamentId,
				playerId,
				standing.placing,
				standing.wins,
				standing.losses,
				standing.ties,
				standing.deck.limitlessId,
				standing.deck.name
			);

			if (playerDeckImporter) {
				await playerDeckImporter.import(
					tournamentId,
					playerId,
					standing
				);
			}
		}
	}
}
