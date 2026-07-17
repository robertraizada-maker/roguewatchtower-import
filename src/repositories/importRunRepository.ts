export async function createImportRun(
	db: D1Database,
	reportDate: string
): Promise<number> {
	const startedAt = new Date().toISOString();

	const result = await db
		.prepare(
			`INSERT INTO import_runs (
				report_date,
				started_at,
				status,
				success
			)
			VALUES (?, ?, 'Running', 0)
			RETURNING id`
		)
		.bind(reportDate, startedAt)
		.first<{ id: number }>();

	if (!result) {
		throw new Error("Failed to create import run");
	}

	return result.id;
}

export async function completeImportRun(
	db: D1Database,
	importRunId: number,
	totalFetched: number,
	tournamentsAfterFilter: number,
	tournamentsInserted: number,
	tournamentsUpdated: number,
	elapsedMs: number
): Promise<void> {
	const completedAt = new Date().toISOString();

	await db
		.prepare(
			`UPDATE import_runs
			SET
				completed_at = ?,
				status = 'Completed',
				success = 1,
				total_fetched = ?,
				tournaments_after_filter = ?,
				tournaments_inserted = ?,
				tournaments_updated = ?,
				elapsed_ms = ?,
				error_message = NULL
			WHERE id = ?`
		)
		.bind(
			completedAt,
			totalFetched,
			tournamentsAfterFilter,
			tournamentsInserted,
			tournamentsUpdated,
			elapsedMs,
			importRunId
		)
		.run();
}

export async function failImportRun(
	db: D1Database,
	importRunId: number,
	errorMessage: string,
	elapsedMs: number
): Promise<void> {
	const completedAt = new Date().toISOString();

	await db
		.prepare(
			`UPDATE import_runs
			SET
				completed_at = ?,
				status = 'Failed',
				success = 0,
				error_message = ?,
				elapsed_ms = ?
			WHERE id = ?`
		)
		.bind(
			completedAt,
			errorMessage,
			elapsedMs,
			importRunId
		)
		.run();
}

export interface DeleteImportDataResult {
	reportDate: string;
	decklistCardsDeleted: number;
	decklistsDeleted: number;
	standingsDeleted: number;
	tournamentsDeleted: number;
	importRunsDeleted: number;
}

function getChanges(result: D1Result): number {
	return result.meta?.changes ?? 0;
}

function getTournamentCleanupCondition(alias = "") {
	const prefix = alias ? `${alias}.` : "";

	return `${prefix}tournament_date = ?
				 OR ${prefix}last_import_run_id IN (
					 SELECT id
					 FROM import_runs
					 WHERE report_date = ?
				 )`;
}

export async function deleteImportDataForDate(
	db: D1Database,
	reportDate: string
): Promise<DeleteImportDataResult> {
	const tournamentCondition = getTournamentCleanupCondition();
	const joinedTournamentCondition = getTournamentCleanupCondition("t");
	const decklistCards = await db
		.prepare(
			`DELETE FROM decklist_cards
			 WHERE decklist_id IN (
				 SELECT d.id
				 FROM decklists d
				 INNER JOIN tournaments t ON t.id = d.tournament_id
				 WHERE ${joinedTournamentCondition}
			 )`
		)
		.bind(reportDate, reportDate)
		.run();

	const decklists = await db
		.prepare(
			`DELETE FROM decklists
			 WHERE tournament_id IN (
				 SELECT id
				 FROM tournaments
				 WHERE ${tournamentCondition}
			 )`
		)
		.bind(reportDate, reportDate)
		.run();

	const standings = await db
		.prepare(
			`DELETE FROM tournament_standings
			 WHERE tournament_id IN (
				 SELECT id
				 FROM tournaments
				 WHERE ${tournamentCondition}
			 )`
		)
		.bind(reportDate, reportDate)
		.run();

	const tournaments = await db
		.prepare(
			`DELETE FROM tournaments
			 WHERE ${tournamentCondition}`
		)
		.bind(reportDate, reportDate)
		.run();

	const importRuns = await db
		.prepare(
			`DELETE FROM import_runs
			 WHERE report_date = ?`
		)
		.bind(reportDate)
		.run();

	return {
		reportDate,
		decklistCardsDeleted: getChanges(decklistCards),
		decklistsDeleted: getChanges(decklists),
		standingsDeleted: getChanges(standings),
		tournamentsDeleted: getChanges(tournaments),
		importRunsDeleted: getChanges(importRuns),
	};
}
