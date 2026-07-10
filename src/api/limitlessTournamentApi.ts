import { Tournament } from "../models/tournament";

export async function getTournament(
	tournamentId: string
): Promise<any> {
	const response = await fetch(
		`https://play.limitlesstcg.com/api/tournaments/${tournamentId}/details`,
		{
			headers: {
				"User-Agent": "RogueWatchtower/0.1",
			},
		}
	);

	if (!response.ok) {
		throw new Error(
			`Limitless tournament details API failed (${response.status})`
		);
	}

	return await response.json();
}

export async function testTournamentEndpoint(
	tournamentId: string,
	endpoint: string
): Promise<any> {
	const response = await fetch(
		`https://play.limitlesstcg.com/api/tournaments/${tournamentId}/${endpoint}`,
		{
			headers: {
				"User-Agent": "RogueWatchtower/0.1",
			},
		}
	);

	return {
		endpoint,
		status: response.status,
		ok: response.ok,
		body: response.ok ? await response.json() : null,
	};
}

export async function getTournamentStandings(
	tournamentId: string
): Promise<any[]> {
	const response = await fetch(
		`https://play.limitlesstcg.com/api/tournaments/${tournamentId}/standings`,
		{
			headers: {
				"User-Agent": "RogueWatchtower/0.1",
			},
		}
	);

	if (!response.ok) {
		throw new Error(
			`Limitless tournament standings API failed (${response.status})`
		);
	}

	return await response.json() as any[];
}
