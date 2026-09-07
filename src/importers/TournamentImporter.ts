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
	tournamentsUnchanged: number;
	tournaments: ImportedTournament[];
}

export class TournamentImporter {
	constructor(private db: D1Database) { }

	async importForDate(
		reportDate: string,
		importRunId: number,
		incremental = false
	): Promise<TournamentImportResult> {
		const tournaments = await getStandardTournaments();
		const filtered = filterTournamentsForDate(tournaments, reportDate);

		let tournamentsInserted = 0;
		let tournamentsUpdated = 0;
		let tournamentsUnchanged = 0;

		const importedTournaments: ImportedTournament[] = [];

		for (const tournament of filtered) {
			const upsertResult = await upsertTournament(
				this.db,
				importRunId,
				tournament,
				incremental
			);

			importedTournaments.push({
				id: upsertResult.id,
				limitlessId: tournament.id,
			});

			if (upsertResult.result === "inserted") {
				tournamentsInserted++;
			} else if (upsertResult.result === "updated") {
				tournamentsUpdated++;
			} else {
				tournamentsUnchanged++;
			}
		}

		return {
			totalFetched: tournaments.length,
			tournamentsAfterFilter: filtered.length,
			tournamentsInserted,
			tournamentsUpdated,
			tournamentsUnchanged,
			tournaments: importedTournaments,
		};
	}
}
