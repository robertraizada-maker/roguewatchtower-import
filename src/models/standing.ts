import { Player } from "./player";
import { Deck } from "./deck";
import { Decklist } from "./decklist";

export interface Standing {
	player: Player;
	deck: Deck;
	decklist: Decklist;
	placing: number | null;
	wins: number;
	losses: number;
	ties: number;
	drop: number | null;
}
