import {
	getStandardTournaments,
	filterTournamentsForDate,
} from "../api/limitlessApi";
import { upsertTournament } from "../repositories/tournamentRepository";

export interface ImportedTournament {
	id: number;
	limitlessId: string;
}

export interface TournamentImportResult {
	totalFetched: number;
	tournamentsAfterFilter: number;
	tournamentsInserted: number;
	tournamentsUpdated: number;
	tournaments: ImportedTournament[];
}

export class TournamentImporter {
	constructor(private db: D1Database) { }

	async importForDate(
		reportDate: string,
		importRunId: number
	): Promise<TournamentImportResult> {
		const tournaments = await getStandardTournaments();
		const filtered = filterTournamentsForDate(tournaments, reportDate);

		let tournamentsInserted = 0;
		let tournamentsUpdated = 0;

		const importedTournaments: ImportedTournament[] = [];

		for (const tournament of filtered) {
			const upsertResult = await upsertTournament(
				this.db,
				importRunId,
				tournament
			);

			importedTournaments.push({
				id: upsertResult.id,
				limitlessId: tournament.id,
			});

			if (upsertResult.result === "inserted") {
				tournamentsInserted++;
			} else {
				tournamentsUpdated++;
			}
		}

		return {
			totalFetched: tournaments.length,
			tournamentsAfterFilter: filtered.length,
			tournamentsInserted,
			tournamentsUpdated,
			tournaments: importedTournaments,
		};
	}
}
