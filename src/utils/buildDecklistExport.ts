type DecklistCard = {
	count: number;
	set: string;
	number: string;
	name: string;
};

type StandingDecklist = {
	pokemon: DecklistCard[];
	trainer: DecklistCard[];
	energy: DecklistCard[];
};

function buildSection(title: string, cards: DecklistCard[]): string {
	const total = cards.reduce((sum, card) => sum + card.count, 0);

	const lines = cards.map(
		(card) => `${card.count} ${card.name} ${card.set} ${card.number}`
	);

	return `${title}: ${total}\n${lines.join("\n")}`;
}

export function buildDecklistExport(decklist: StandingDecklist): string {
	return [
		buildSection("Pokémon", decklist.pokemon),
		buildSection("Trainer", decklist.trainer),
		buildSection("Energy", decklist.energy),
	].join("\n\n");
}
