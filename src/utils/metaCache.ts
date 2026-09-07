export interface CachedJsonResult<T> {
	data: T;
	cacheStatus: "HIT" | "MISS";
	ttlSeconds: number;
}

export async function getCachedJson<T>(
	request: Request,
	ctx: ExecutionContext,
	cacheKey: URL,
	ttlSeconds: number,
	load: () => Promise<T>
): Promise<CachedJsonResult<T>> {
	const cacheRequest = new Request(cacheKey.toString(), { method: "GET" });
	const cachedResponse = await caches.default.match(cacheRequest);

	if (cachedResponse) {
		return {
			data: await cachedResponse.json<T>(),
			cacheStatus: "HIT",
			ttlSeconds,
		};
	}

	const data = await load();
	const response = Response.json(data, {
		headers: {
			"Cache-Control": `public, max-age=${ttlSeconds}`,
		},
	});

	ctx.waitUntil(caches.default.put(cacheRequest, response));

	return { data, cacheStatus: "MISS", ttlSeconds };
}

export function getMetaCacheKey(request: Request, reportDate?: string): URL {
	const key = new URL(request.url);
	key.search = "";
	key.searchParams.set("names", "limitless-v2");

	if (reportDate) {
		key.searchParams.set("date", reportDate);
	}

	return key;
}

export function getRogueCacheTtl(reportDate: string, now = new Date()): number {
	const recentThreshold = new Date(now);
	recentThreshold.setUTCDate(recentThreshold.getUTCDate() - 2);
	const thresholdDate = recentThreshold.toISOString().slice(0, 10);

	return reportDate >= thresholdDate ? 300 : 86400;
}