import { Standing } from "../models/standing";

export function parseStanding(data: any): Standing {
	if (typeof data.name !== "string" || !data.name.trim()) {
		throw new Error("Limitless standing is missing its display name");
	}
	return {
		player: {
			// Internal handle for identity and URLs only.
			name: data.player ?? data.name,
			displayName: data.name,
			country: data.country ?? null,
		},
		deck: {
			limitlessId: data.deck?.id ?? "unknown",
			name: data.deck?.name ?? "Unknown",
			icons: data.deck?.icons ?? [],
		},
		decklist: {
			pokemon: (data.decklist?.pokemon ?? []).map((card: any) => ({
				...card,
				section: "pokemon",
			})),
			trainer: (data.decklist?.trainer ?? []).map((card: any) => ({
				...card,
				section: "trainer",
			})),
			energy: (data.decklist?.energy ?? []).map((card: any) => ({
				...card,
				section: "energy",
			})),
		},
		placing: data.placing ?? null,
		wins: data.record.wins,
		losses: data.record.losses,
		ties: data.record.ties,
		drop: data.drop,
	};
}
