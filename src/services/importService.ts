import { getDateDaysAgoInTimeZone, getYesterdayInImportTimeZone } from "../utils/dateHelper";
import { IMPORT_SETTINGS } from "../config";
import {
	createImportRun,
	completeImportRun,
	failImportRun,
} from "../repositories/importRunRepository";
import { TournamentImporter } from "../importers/TournamentImporter";
import { StandingImporter } from "../importers/StandingImporter";
import { ImportedStanding } from "../models/importedStanding";
import { buildDecklistExport } from "../utils/buildDecklistExport";
import { getTopRogueDecksForDate } from "../repositories/metaRepository";

export class ImportService {
	constructor(private db: D1Database) { }

	async importDaysAgo(daysAgo: number) {
		const dateString = getDateDaysAgoInTimeZone(daysAgo);

		return await this.importDate(dateString);
	}

	async importDate(reportDate?: string) {
		const selectedDate = reportDate || getYesterdayInImportTimeZone();
		const startedAt = Date.now();

		const importRunId = await createImportRun(this.db, selectedDate);

		try {
			const tournamentImporter = new TournamentImporter(this.db);
			const t0 = Date.now();

			const result = await tournamentImporter.importForDate(
				selectedDate,
				importRunId
			);

			console.log("Tournament import:", Date.now() - t0);
			const t1 = Date.now();

			const standingImporter = new StandingImporter(this.db);
			const importedStandings: ImportedStanding[] = [];
			const batchSize = 5;

			for (let i = 0; i < result.tournaments.length; i += batchSize) {
				const batch = result.tournaments.slice(i, i + batchSize);

				const batchResults = await Promise.all(
					batch.map((tournament) =>
						standingImporter.importForTournament(
							tournament.id,
							tournament.limitlessId
						)
					)
				);

				for (const tournamentStandings of batchResults) {
					importedStandings.push(...tournamentStandings);
				}
			}

			console.log("Standings import:", Date.now() - t1);
			const t2 = Date.now();

			const topRogueDecks = await getTopRogueDecksForDate(
				this.db,
				selectedDate
			);

			for (const rogueDeck of topRogueDecks) {
				const match = importedStandings.find(
					(item) =>
						item.tournamentId === rogueDeck.tournament_id &&
						item.playerId === rogueDeck.player_id
				);

				if (!match) {
					continue;
				}

				const decklistExport = buildDecklistExport(
					match.standing.decklist
				);

				await this.db
					.prepare(
						`UPDATE tournament_standings
			 SET decklist_export = ?
			 WHERE tournament_id = ?
			   AND player_id = ?`
					)
					.bind(
						decklistExport,
						match.tournamentId,
						match.playerId
					)
					.run();
			}

			console.log("Rogue calculation:", Date.now() - t2);

			const elapsedMs = Date.now() - startedAt;

			await completeImportRun(
				this.db,
				importRunId,
				result.totalFetched,
				result.tournamentsAfterFilter,
				result.tournamentsInserted,
				result.tournamentsUpdated,
				elapsedMs
			);

			return {
				success: true,
				reportDate: selectedDate,
				importRunId,
				summary: {
					totalFetched: result.totalFetched,
					game: IMPORT_SETTINGS.game,
					format: IMPORT_SETTINGS.format,
					tournamentsAfterFilter: result.tournamentsAfterFilter,
					tournamentsInserted: result.tournamentsInserted,
					tournamentsUpdated: result.tournamentsUpdated,
					elapsedMs,
				},
				tournaments: result.tournaments,
			};
		} catch (error) {
			const elapsedMs = Date.now() - startedAt;
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			await failImportRun(
				this.db,
				importRunId,
				errorMessage,
				elapsedMs
			);

			throw error;
		}
	}

	async importYesterday() {
		return this.importDate();
	}
}
