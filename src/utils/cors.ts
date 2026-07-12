const DEFAULT_ALLOWED_ORIGINS = [
	"http://localhost:3000",
	"http://127.0.0.1:3000",
];

export interface CorsEnv {
	ALLOWED_ORIGINS?: string;
}

export function getAllowedOrigins(env: CorsEnv): string[] {
	if (env.ALLOWED_ORIGINS) {
		return env.ALLOWED_ORIGINS
			.split(",")
			.map((origin) => origin.trim())
			.filter(Boolean);
	}

	return DEFAULT_ALLOWED_ORIGINS;
}

export function isOriginAllowed(
	origin: string | null,
	env: CorsEnv
): boolean {
	if (!origin) {
		return false;
	}

	return getAllowedOrigins(env).includes(origin);
}

export function corsHeaders(
	request: Request,
	env: CorsEnv
): Record<string, string> {
	const origin = request.headers.get("Origin");

	if (!origin || !isOriginAllowed(origin, env)) {
		return {};
	}

	return {
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Allow-Methods": "GET, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Max-Age": "86400",
		Vary: "Origin",
	};
}

export function withCors(
	request: Request,
	env: CorsEnv,
	response: Response
): Response {
	const headers = new Headers(response.headers);

	for (const [key, value] of Object.entries(corsHeaders(request, env))) {
		headers.set(key, value);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

export function jsonWithCors(
	request: Request,
	env: CorsEnv,
	data: unknown,
	init?: ResponseInit
): Response {
	return withCors(request, env, Response.json(data, init));
}

export function corsPreflightResponse(
	request: Request,
	env: CorsEnv
): Response {
	if (!isOriginAllowed(request.headers.get("Origin"), env)) {
		return new Response(null, { status: 403 });
	}

	return new Response(null, {
		status: 204,
		headers: corsHeaders(request, env),
	});
}

export function isMetaPath(pathname: string): boolean {
	return pathname.startsWith("/meta/");
}
