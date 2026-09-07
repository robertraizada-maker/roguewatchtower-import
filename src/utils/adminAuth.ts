export interface AdminAuthEnv {
	ADMIN_API_TOKEN?: string;
}

function timingSafeEqual(left: string, right: string): boolean {
	if (left.length !== right.length) return false;
	let difference = 0;
	for (let index = 0; index < left.length; index += 1) {
		difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
	}
	return difference === 0;
}

export function requireAdminApiToken(request: Request, env: AdminAuthEnv): Response | null {
	if (!env.ADMIN_API_TOKEN) {
		return Response.json(
			{ success: false, message: "ADMIN_API_TOKEN is not configured." },
			{ status: 503 }
		);
	}
	const authorization = request.headers.get("Authorization") || "";
	const token = authorization.startsWith("Bearer ")
		? authorization.slice("Bearer ".length)
		: "";
	if (!token || !timingSafeEqual(token, env.ADMIN_API_TOKEN)) {
		return Response.json(
			{ success: false, message: "Unauthorized" },
			{ status: 401 }
		);
	}
	return null;
}