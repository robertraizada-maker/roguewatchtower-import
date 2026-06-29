import { Tournament } from "../models/tournament";
import { getDatePart } from "../utils/dateHelper";
import { IMPORT_SETTINGS } from "../config";

const LIMITLESS_TOURNAMENTS_URL =
	`https://play.limitlesstcg.com/api/tournaments?game=${IMPORT_SETTINGS.game}&format=${IMPORT_SETTINGS.format}&limit=${IMPORT_SETTINGS.tournamentLimit}`;

export async function getStandardTournaments(): Promise<Tournament[]> {
	const response = await fetch(LIMITLESS_TOURNAMENTS_URL, {
		headers: {
			"User-Agent": "RogueWatchtower/0.1",
		},
	});

	if (!response.ok) {
		throw new Error(`Limitless API failed with status ${response.status}`);
	}

	return (await response.json()) as Tournament[];
}

export function filterTournamentsForDate(
	tournaments: Tournament[],
	reportDate: string
): Tournament[] {
	return tournaments.filter((tournament) => {
		return (
			getDatePart(tournament.date) === reportDate &&
			tournament.game === IMPORT_SETTINGS.game &&
			tournament.format === IMPORT_SETTINGS.format &&
			tournament.players >= IMPORT_SETTINGS.minimumPlayers
		);
	});
}
