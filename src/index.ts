import { ImportService } from "./services/importService";
import {
	getTournament,
	testTournamentEndpoint,
} from "./api/limitlessTournamentApi";
import { getUtcDateDaysAgo } from "./utils/dateHelper";
import { IMPORT_SETTINGS } from "./config";
import {
	getTopRogueDecksForDate,
	getAvailableMetaDates,
} from "./repositories/metaRepository";

export interface Env {
	DB: D1Database;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		try {
			const url = new URL(request.url);
			const pathname = url.pathname;

			// Temporary endpoint to inspect a tournament
			if (pathname === "/tournament") {
				const tournamentId =
					url.searchParams.get("id") ||
					"6a3845faaf50e12308407ebe";

				return Response.json(await getTournament(tournamentId));
			}

			// Temporary endpoint explorer
			if (pathname === "/explore") {
				const tournamentId =
					url.searchParams.get("id") ||
					"6a3845faaf50e12308407ebe";

				const endpoints = [
					"details",
					"standings",
					"pairings",
				];

				const results = [];

				for (const endpoint of endpoints) {
					results.push(
						await testTournamentEndpoint(tournamentId, endpoint)
					);
				}

				return Response.json(results);
			}

			if (pathname === "/meta/rogue") {
				const reportDate =
					url.searchParams.get("date") ||
					getUtcDateDaysAgo(1);

				const rogueDecks = await getTopRogueDecksForDate(
					env.DB,
					reportDate
				);

				return Response.json({
					success: true,
					reportDate,
					rogueDecks,
				});
			}

			if (pathname === "/meta/available-dates") {
				const dates = await getAvailableMetaDates(env.DB);

				return Response.json({
					success: true,
					dates,
				});
			}

			// Backfill recent days
			if (pathname === "/backfill") {
				const backfillDays = Number(
					url.searchParams.get("days") ?? IMPORT_SETTINGS.backfillDays
				);

				const importService = new ImportService(env.DB);
				const results = [];

				for (let i = 1; i <= backfillDays; i++) {
					const reportDate = getUtcDateDaysAgo(i);

					const existing = await env.DB
						.prepare(
							`SELECT id
				 FROM import_runs
				 WHERE report_date = ?
				   AND success = 1
				 LIMIT 1`
						)
						.bind(reportDate)
						.first<{ id: number }>();

					if (existing) {
						results.push({
							reportDate,
							status: "Skipped",
							reason: "Already imported successfully",
						});

						continue;
					}

					const result = await importService.importDate(reportDate);

					results.push({
						reportDate,
						status: "Imported",
						importRunId: result.importRunId,
						summary: result.summary,
					});

					// Be kind to Limitless
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}

				return Response.json({
					success: true,
					backfillDays,
					results,
				});
			}

			// Default import endpoint
			const date = url.searchParams.get("date") || undefined;

			const importService = new ImportService(env.DB);
			const result = await importService.importDate(date);

			return Response.json(result);
		} catch (error) {
			return Response.json(
				{
					success: false,
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	},
};
