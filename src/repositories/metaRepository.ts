import { ROGUE_SETTINGS } from "../config";
import {
	getMetaDeckCriteriaForDate,
	type MetaDeckCriteriaRecord,
} from "./metaDeckCriteriaRepository";

interface PokemonCardLine {
	quantity: number;
	name: string;
}

function normalisePokemonName(name: string) {
	return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function parsePokemonCardLine(line: string): PokemonCardLine | null {
	const match = /^(\d+)\s+(.+)$/.exec(line.trim());

	if (!match) {
		return null;
	}

	const cardText = match[2].trim();
	const cardParts = cardText.split(/\s+/);
	const maybeSetCode = cardParts.at(-2) ?? "";
	const maybeCardNumber = cardParts.at(-1) ?? "";
	const hasSetAndNumber =
		cardParts.length >= 3 &&
		/^[A-Z0-9]{2,8}$/i.test(maybeSetCode) &&
		/^[A-Z]*\d+[a-z]?(?:\/\d+)?$/i.test(maybeCardNumber);

	return {
		quantity: Number(match[1]),
		name: hasSetAndNumber ? cardParts.slice(0, -2).join(" ") : cardText,
	};
}

function getPokemonLines(decklistExport: string | null) {
	if (!decklistExport) {
		return [];
	}

	const lines = decklistExport.split(/\r?\n/);
	const pokemonHeaderIndex = lines.findIndex((line) =>
		/^pok.mon:/i.test(line.trim())
	);

	if (pokemonHeaderIndex === -1) {
		return [];
	}

	const pokemonLines: string[] = [];

	for (const line of lines.slice(pokemonHeaderIndex + 1)) {
		const trimmed = line.trim();

		if (!trimmed) {
			continue;
		}

		if (/^(trainer|energy):/i.test(trimmed)) {
			break;
		}

		pokemonLines.push(trimmed);
	}

	return pokemonLines;
}

function getPokemonCounts(decklistExport: string | null) {
	const counts = new Map<string, number>();

	getPokemonLines(decklistExport)
		.map(parsePokemonCardLine)
		.filter((card): card is PokemonCardLine => card !== null)
		.forEach((card) => {
			const name = normalisePokemonName(card.name);
			counts.set(name, (counts.get(name) ?? 0) + card.quantity);
		});

	return counts;
}

function getMatchingPokemonCount(
	pokemonCounts: Map<string, number>,
	pokemonName: string
) {
	const normalisedPokemonName = normalisePokemonName(pokemonName);
	const exactCount = pokemonCounts.get(normalisedPokemonName);

	if (exactCount !== undefined) {
		return exactCount;
	}

	let matchingCount = 0;

	pokemonCounts.forEach((count, cardName) => {
		if (cardName.startsWith(`${normalisedPokemonName} `)) {
			matchingCount += count;
		}
	});

	return matchingCount;
}

function matchesMetaDeckCriteria(
	decklistExport: string | null,
	metaDeckCriteria: MetaDeckCriteriaRecord[]
) {
	if (metaDeckCriteria.length === 0) {
		return false;
	}

	const pokemonCounts = getPokemonCounts(decklistExport);

	return metaDeckCriteria.some((deckType) =>
		deckType.criteria.every((criterion) => {
			const count = getMatchingPokemonCount(
				pokemonCounts,
				criterion.pokemonName
			);

			return count >= criterion.minQuantity;
		})
	);
}

export async function getTopRogueDecksForDate(
	db: D1Database,
	reportDate: string
): Promise<any[]> {
	const activeMetaDeckCriteria = await getMetaDeckCriteriaForDate(
		db,
		reportDate
	);
	const candidateLimit = activeMetaDeckCriteria.length > 0
		? ROGUE_SETTINGS.rogueDeckCount * 5
		: ROGUE_SETTINGS.rogueDeckCount;
	const result = await db
		.prepare(
			`WITH ranked_meta_decks AS (
				SELECT
					ts.deck_name,
					COUNT(*) AS play_count,
					ROW_NUMBER() OVER (
						ORDER BY COUNT(*) DESC, ts.deck_name ASC
					) AS meta_rank
				FROM tournament_standings ts
				INNER JOIN tournaments t
					ON ts.tournament_id = t.id
				WHERE ts.deck_name IS NOT NULL
				  AND ts.deck_name <> 'Unknown'
				  AND ts.deck_name <> 'Other'
				  AND DATE(t.tournament_date) >= DATE(?, '-' || ? || ' days')
				  AND DATE(t.tournament_date) < DATE(?)
				GROUP BY ts.deck_name
			),
			rogue_results AS (
				SELECT
					ts.tournament_id,
					t.limitless_id AS tournament_limitless_id,
					ts.player_id,
					ts.deck_name,
					rmd.meta_rank,
					rmd.play_count AS meta_play_count,
					CASE
						WHEN rmd.meta_rank IS NULL THEN 5
						WHEN rmd.meta_rank <= 60 THEN 1
						WHEN rmd.meta_rank <= 70 THEN 2
						WHEN rmd.meta_rank <= 80 THEN 3
						WHEN rmd.meta_rank <= 90 THEN 4
						ELSE 5
					END AS rogue_rating,
					p.name AS player_name,
					t.name AS tournament_name,
					t.players AS tournament_players,
					ts.standing,
					ts.record_wins,
					ts.record_losses,
					ts.record_ties,
					ts.decklist_export,
					(ts.record_wins + ts.record_losses + ts.record_ties) AS rounds_played,
					ROUND((ts.standing * 100.0) / NULLIF(t.players, 0), 2) AS finish_percentage
				FROM tournament_standings ts
				INNER JOIN tournaments t
					ON ts.tournament_id = t.id
				INNER JOIN players p
					ON ts.player_id = p.id
				LEFT JOIN ranked_meta_decks rmd
					ON ts.deck_name = rmd.deck_name
				WHERE ts.deck_name IS NOT NULL
				  AND ts.deck_name <> 'Unknown'
				  AND ts.standing IS NOT NULL
				  AND DATE(t.tournament_date) = DATE(?)
				  AND (
					  rmd.meta_rank IS NULL
					  OR rmd.meta_rank > ?
				  )
				  AND t.players >= 32
			),
			best_rogue_results AS (
				SELECT
					deck_name,
					MIN(finish_percentage) AS best_finish_percentage
				FROM rogue_results
				GROUP BY deck_name
			)
			SELECT
				rr.tournament_id,
				rr.tournament_limitless_id,
				rr.player_id,
				rr.deck_name,
				rr.meta_rank,
				rr.meta_play_count,
				rr.rogue_rating,
				rr.player_name,
				rr.tournament_name,
				rr.tournament_players,
				rr.standing,
				rr.record_wins AS wins,
				rr.record_losses AS losses,
				rr.record_ties AS ties,
				rr.rounds_played,
				rr.finish_percentage,
				rr.decklist_export
			FROM rogue_results rr
			INNER JOIN best_rogue_results brr
				ON rr.deck_name = brr.deck_name
			   AND rr.finish_percentage = brr.best_finish_percentage
			ORDER BY
				rr.finish_percentage ASC,
				rr.tournament_players DESC,
				rr.record_wins DESC,
				rr.standing ASC,
				rr.player_id ASC
			LIMIT ?`
		)
		.bind(
			reportDate,
			ROGUE_SETTINGS.metaWindowDays,
			reportDate,
			reportDate,
			ROGUE_SETTINGS.metaDeckCount,
			candidateLimit
		)
		.all<any>();

	return (result.results ?? [])
		.filter(
			(deck) =>
				!matchesMetaDeckCriteria(
					deck.decklist_export,
					activeMetaDeckCriteria
				)
		)
		.slice(0, ROGUE_SETTINGS.rogueDeckCount);
}

export async function getAvailableMetaDates(
	db: D1Database
): Promise<string[]> {
	const result = await db
		.prepare(
			`SELECT DISTINCT
    report_date
FROM import_runs
WHERE status = 'Completed'
ORDER BY DATE(report_date) DESC
LIMIT 28`
		)
		.all<{ report_date: string }>();

	return (result.results ?? []).map((row) => row.report_date);
}
