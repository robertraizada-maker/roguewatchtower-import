import { ImportService } from "./services/importService";
import {
	getTournament,
	testTournamentEndpoint,
} from "./api/limitlessTournamentApi";
import { getUtcDateDaysAgo, getYesterdayInImportTimeZone, isImportScheduleTime } from "./utils/dateHelper";
import {
	getTopRogueDecksForDate,
	getAvailableMetaDates,
} from "./repositories/metaRepository";
import {
	corsPreflightResponse,
	isMetaPath,
	jsonWithCors,
} from "./utils/cors";
import { triggerPagesDeploy } from "./utils/triggerPagesDeploy";
import { deleteImportDataForDate } from "./repositories/importRunRepository";

export interface Env {
	DB: D1Database;
	ALLOWED_ORIGINS?: string;
	PAGES_DEPLOY_HOOK_URL?: string;
	ADMIN_API_TOKEN?: string;
}

function timingSafeEqual(left: string, right: string): boolean {
	if (left.length !== right.length) {
		return false;
	}

	let difference = 0;

	for (let index = 0; index < left.length; index += 1) {
		difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
	}

	return difference === 0;
}

function requireAdminApiToken(request: Request, env: Env): Response | null {
	if (!env.ADMIN_API_TOKEN) {
		return Response.json(
			{
				success: false,
				message: "ADMIN_API_TOKEN is not configured.",
			},
			{ status: 503 }
		);
	}

	const authorization = request.headers.get("Authorization") || "";
	const token = authorization.startsWith("Bearer ")
		? authorization.slice("Bearer ".length)
		: "";

	if (!token || !timingSafeEqual(token, env.ADMIN_API_TOKEN)) {
		return Response.json(
			{
				success: false,
				message: "Unauthorized",
			},
			{ status: 401 }
		);
	}

	return null;
}

async function readJsonBody(request: Request): Promise<any> {
	try {
		return await request.json();
	} catch {
		return null;
	}
}
export default {
	async scheduled(controller: ScheduledController, env: Env): Promise<void> {
		const scheduledDate = new Date(controller.scheduledTime);

		if (!isImportScheduleTime(scheduledDate)) {
			console.log("Skipping scheduled import outside Limitless UTC 00:15", {
				cron: controller.cron,
				scheduledTime: scheduledDate.toISOString(),
			});

			return;
		}

		const reportDate = getYesterdayInImportTimeZone(scheduledDate);
		const importService = new ImportService(env.DB);
		const result = await importService.importDate(reportDate);
		const pagesDeploy = await triggerPagesDeploy(env);

		console.log("Scheduled import complete", {
			reportDate: result.reportDate,
			importRunId: result.importRunId,
			pagesDeploy,
		});
	},

	async fetch(request: Request, env: Env): Promise<Response> {
		try {
			const url = new URL(request.url);
			const pathname = url.pathname;

			if (request.method === "OPTIONS" && isMetaPath(pathname)) {
				return corsPreflightResponse(request, env);
			}

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

			if (pathname === "/admin/import/yesterday") {
				const unauthorized = requireAdminApiToken(request, env);

				if (unauthorized) {
					return unauthorized;
				}

				if (request.method !== "POST" && request.method !== "DELETE") {
					return Response.json(
						{
							success: false,
							message: "Method not allowed.",
						},
						{ status: 405, headers: { Allow: "POST, DELETE" } }
					);
				}

				const body = await readJsonBody(request);
				const reportDate = body?.date || url.searchParams.get("date") || getUtcDateDaysAgo(1);

				if (request.method === "DELETE") {
					const result = await deleteImportDataForDate(env.DB, reportDate);
					const pagesDeploy = await triggerPagesDeploy(env);

					return Response.json({
						success: true,
						message: `Deleted import data for ${reportDate}.`,
						...result,
						pagesDeploy,
					});
				}

				const importService = new ImportService(env.DB);
				const result = await importService.importDate(reportDate);
				const pagesDeploy = await triggerPagesDeploy(env);

				return Response.json({
					...result,
					message: `Imported data for ${reportDate}.`,
					pagesDeploy,
				});
			}
			if (pathname === "/meta/rogue") {
				const reportDate =
					url.searchParams.get("date") ||
					getUtcDateDaysAgo(1);

				const rogueDecks = await getTopRogueDecksForDate(
					env.DB,
					reportDate
				);

				return jsonWithCors(request, env, {
					success: true,
					reportDate,
					rogueDecks,
				});
			}

			if (pathname === "/meta/available-dates") {
				const dates = await getAvailableMetaDates(env.DB);

				return jsonWithCors(request, env, {
					success: true,
					dates,
				});
			}

			// Backfill removed
			if (pathname === "/backfill") {
				return Response.json(
					{
						success: false,
						message:
							"Backfill has been removed. Use /import?daysAgo=56, then 55, 54 ... down to 1.",
					},
					{ status: 410 }
				);
			}

			const importService = new ImportService(env.DB);

			if (url.pathname === "/import") {
				const daysAgoParam = url.searchParams.get("daysAgo");

				const daysAgo = daysAgoParam
					? parseInt(daysAgoParam, 10)
					: 1;

				if (isNaN(daysAgo) || daysAgo < 1) {
					return Response.json({
						success: false,
						message: "daysAgo must be a positive number. Example: /import?daysAgo=56"
					}, { status: 400 });
				}

				const result = await importService.importDaysAgo(daysAgo);
				const pagesDeploy = await triggerPagesDeploy(env);

				return Response.json({
					...result,
					pagesDeploy,
				});
			}

			if (pathname === "/import-range") {
				const from = Number(url.searchParams.get("from") ?? 56);
				const to = Number(url.searchParams.get("to") ?? 1);

				if (isNaN(from) || isNaN(to) || from < to || to < 1) {
					return Response.json(
						{
							success: false,
							message: "Use /import-range?from=56&to=1",
						},
						{ status: 400 }
					);
				}

				const importService = new ImportService(env.DB);
				const results = [];

				for (let daysAgo = from; daysAgo >= to; daysAgo--) {
					const reportDate = getUtcDateDaysAgo(daysAgo);

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
							daysAgo,
							reportDate,
							status: "Skipped",
							reason: "Already imported successfully",
						});

						continue;
					}

					try {
						const result = await importService.importDaysAgo(daysAgo);

						results.push({
							daysAgo,
							reportDate,
							status: "Imported",
							importRunId: result.importRunId,
							summary: result.summary,
						});
					}
					catch (error) {
						return Response.json(
							{
								success: false,
								message: error instanceof Error ? error.message : String(error),
								failedDaysAgo: daysAgo,
								results,
							},
							{ status: 500 }
						);
					}

					if (daysAgo > to) {
						await new Promise((resolve) => setTimeout(resolve, 40000));
					}
				}

				const importedAny = results.some(
					(result) => result.status === "Imported"
				);
				const pagesDeploy = importedAny
					? await triggerPagesDeploy(env)
					: { triggered: false };

				return Response.json({
					success: true,
					from,
					to,
					delaySeconds: 40,
					results,
					pagesDeploy,
				});
			}

			return Response.json(
				{
					success: false,
					message: "Not found",
				},
				{ status: 404 }
			);
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
