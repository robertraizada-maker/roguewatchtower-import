import { getTournamentStandings } from "../api/limitlessTournamentApi";
import { parseStanding } from "../parsers/standingParser";
import { upsertPlayers } from "../repositories/playerRepository";
import {
	StandingUpsert,
	upsertStandings,
} from "../repositories/standingRepository";
import { PlayerDeckImporter } from "./PlayerDeckImporter";
import { IMPORT_SETTINGS } from "../config";
import { ImportedStanding } from "../models/importedStanding";

export class StandingImporter {
	constructor(private db: D1Database) { }

	async importForTournament(
		tournamentId: number,
		limitlessTournamentId: string
	): Promise<ImportedStanding[]> {
		const standingsJson =
			await getTournamentStandings(limitlessTournamentId);

		/*
		 * Parse every standing before writing anything to D1.
		 */
		const parsedStandings = standingsJson.map((standingJson) =>
			parseStanding(standingJson)
		);

		/*
		 * Insert/update all players in one D1 batch and retrieve their IDs.
		 */
		const playerIds = await upsertPlayers(
			this.db,
			parsedStandings.map((standing) => standing.player)
		);

		const standingUpserts: StandingUpsert[] = [];
		const importedStandings: ImportedStanding[] = [];

		for (const standing of parsedStandings) {
			const playerId = playerIds.get(standing.player.name);

			if (playerId === undefined) {
				throw new Error(
					`Player ID not found after batch upsert: ${standing.player.name}`
				);
			}

			standingUpserts.push({
				tournamentId,
				playerId,
				placing: standing.placing,
				wins: standing.wins,
				losses: standing.losses,
				ties: standing.ties,
				deckLimitlessId: standing.deck.limitlessId,
				deckName: standing.deck.name,
				decklistExport: "",
			});

			importedStandings.push({
				tournamentId,
				playerId,
				standing,
			});
		}

		/*
		 * Insert/update all standings in one D1 batch.
		 */
		await upsertStandings(this.db, standingUpserts);

		/*
		 * Card-level importing is currently disabled, but preserve the
		 * existing behaviour if importCards is enabled in future.
		 */
		if (IMPORT_SETTINGS.importCards) {
			const playerDeckImporter = new PlayerDeckImporter(this.db);

			for (const importedStanding of importedStandings) {
				await playerDeckImporter.import(
					importedStanding.tournamentId,
					importedStanding.playerId,
					importedStanding.standing
				);
			}
		}

		return importedStandings;
	}
}
