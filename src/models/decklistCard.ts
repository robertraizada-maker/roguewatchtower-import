export type DecklistSection = "pokemon" | "trainer" | "energy";

export interface DecklistCard {
	count: number;
	set: string;
	number: string;
	name: string;
	section: DecklistSection;
}
