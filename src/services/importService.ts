import { getYesterdayUtcDate } from "../utils/dateHelper";
import { IMPORT_SETTINGS } from "../config";
import {
	createImportRun,
	completeImportRun,
	failImportRun,
} from "../repositories/importRunRepository";
import { TournamentImporter } from "../importers/TournamentImporter";
import { StandingImporter } from "../importers/StandingImporter";

export class ImportService {
	constructor(private db: D1Database) { }

	async importDate(reportDate?: string) {
		const selectedDate = reportDate || getYesterdayUtcDate();
		const startedAt = Date.now();

		const importRunId = await createImportRun(this.db, selectedDate);

		try {
			const tournamentImporter = new TournamentImporter(this.db);

			const result = await tournamentImporter.importForDate(
				selectedDate,
				importRunId
			);

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

			const standingImporter = new StandingImporter(this.db);

			for (const tournament of result.tournaments) {
				await standingImporter.importForTournament(
					tournament.id,
					tournament.limitlessId
				);
			}

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
