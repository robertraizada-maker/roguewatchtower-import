import {
	getStandardTournaments,
	filterTournamentsForDate,
} from "../api/limitlessApi";
import { getYesterdayUtcDate } from "../utils/dateHelper";
import { IMPORT_SETTINGS } from "../config";

export class ImportService {
	async importDate(reportDate?: string) {
		const selectedDate = reportDate || getYesterdayUtcDate();

		const tournaments = await getStandardTournaments();

		const filtered = filterTournamentsForDate(tournaments, selectedDate);

		return {
			success: true,
			reportDate: selectedDate,
			summary: {
				totalFetched: tournaments.length,
				game: IMPORT_SETTINGS.game,
				format: IMPORT_SETTINGS.format,
				minimumPlayers: IMPORT_SETTINGS.minimumPlayers,
				tournamentsAfterFilter: filtered.length,
			},
			tournaments: filtered,
		};
	}

	async importYesterday() {
		return this.importDate();
	}
}
