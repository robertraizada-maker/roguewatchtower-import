import { DecklistCard } from "./decklistCard";

export interface Decklist {
	pokemon: DecklistCard[];
	trainer: DecklistCard[];
	energy: DecklistCard[];
}
