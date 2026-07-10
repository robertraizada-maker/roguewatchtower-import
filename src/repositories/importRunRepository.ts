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
