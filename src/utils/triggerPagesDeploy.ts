export interface PagesDeployEnv {
	PAGES_DEPLOY_HOOK_URL?: string;
}

export interface PagesDeployResult {
	triggered: boolean;
	error?: string;
}

export async function triggerPagesDeploy(
	env: PagesDeployEnv
): Promise<PagesDeployResult> {
	if (!env.PAGES_DEPLOY_HOOK_URL) {
		return {
			triggered: false,
			error: "PAGES_DEPLOY_HOOK_URL is not configured",
		};
	}

	try {
		const response = await fetch(env.PAGES_DEPLOY_HOOK_URL, {
			method: "POST",
		});

		if (!response.ok) {
			return {
				triggered: false,
				error: `Deploy hook returned ${response.status}`,
			};
		}

		return { triggered: true };
	} catch (error) {
		return {
			triggered: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}
