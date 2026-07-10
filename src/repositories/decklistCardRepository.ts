import { DecklistCard } from "../models/decklistCard";

export async function replaceDecklistCards(
	db: D1Database,
	decklistId: number,
	cards: DecklistCard[]
): Promise<void> {
	await db
		.prepare(
			`DELETE FROM decklist_cards
			 WHERE decklist_id = ?`
		)
		.bind(decklistId)
		.run();

	for (const card of cards) {
		await db
			.prepare(
				`INSERT INTO decklist_cards (
					decklist_id,
					card_name,
					card_set,
					card_number,
					card_type,
					quantity,
					section
				)
				VALUES (?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				decklistId,
				card.name,
				card.set,
				card.number,
				null,
				card.count,
				card.section
			)
			.run();
	}
}
