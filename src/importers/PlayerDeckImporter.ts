import { Standing } from "../models/standing";
import { DecklistCard } from "../models/decklistCard";
import { upsertPlayerDeck } from "../repositories/playerDeckRepository";
import { replaceDecklistCards } from "../repositories/decklistCardRepository";
import { IMPORT_SETTINGS } from "../config";

export class PlayerDeckImporter {
	constructor(private db: D1Database) { }

	async import(
		tournamentId: number,
		playerId: number,
		standing: Standing
	): Promise<void> {

		const decklistId = await upsertPlayerDeck(
			this.db,
			tournamentId,
			playerId,
			standing.deck
		);

		if (!IMPORT_SETTINGS.importCards) {
			return;
		}

		const cards: DecklistCard[] = [
			...standing.decklist.pokemon,
			...standing.decklist.trainer,
			...standing.decklist.energy,
		];

		await replaceDecklistCards(
			this.db,
			decklistId,
			cards
		);
	}
}
