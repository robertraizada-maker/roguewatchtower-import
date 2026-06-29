import { ImportService } from "./services/importService";

export default {
	async fetch(request: Request): Promise<Response> {
		try {
			const url = new URL(request.url);
			const date = url.searchParams.get("date") || undefined;

			const importService = new ImportService();
			const result = await importService.importDate(date);

			return Response.json(result);
		} catch (error) {
			return Response.json(
				{
					success: false,
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{
					status: 500,
				}
			);
		}
	},
};
