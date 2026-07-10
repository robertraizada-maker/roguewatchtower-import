CREATE TABLE IF NOT EXISTS players (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	limitless_player_id TEXT,
	name TEXT NOT NULL,
	country TEXT,
	created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_players_limitless_player_id
ON players(limitless_player_id);

CREATE TABLE IF NOT EXISTS tournament_standings (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	tournament_id INTEGER NOT NULL,
	player_id INTEGER NOT NULL,
	standing INTEGER,
	record_wins INTEGER,
	record_losses INTEGER,
	record_ties INTEGER,
	points INTEGER,
	resistance REAL,
	decklist_id TEXT,
	created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TEXT,

	FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
	FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_standings_unique_player
ON tournament_standings(tournament_id, player_id);

CREATE TABLE IF NOT EXISTS decklists (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	tournament_id INTEGER NOT NULL,
	player_id INTEGER NOT NULL,
	limitless_decklist_id TEXT,
	archetype TEXT,
	raw_decklist TEXT,
	created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TEXT,

	FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
	FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_decklists_unique_player_tournament
ON decklists(tournament_id, player_id);

CREATE TABLE IF NOT EXISTS decklist_cards (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	decklist_id INTEGER NOT NULL,
	card_name TEXT NOT NULL,
	card_set TEXT,
	card_number TEXT,
	card_type TEXT,
	quantity INTEGER NOT NULL,
	section TEXT NOT NULL,

	FOREIGN KEY (decklist_id) REFERENCES decklists(id)
);

CREATE INDEX IF NOT EXISTS idx_decklist_cards_decklist_id
ON decklist_cards(decklist_id);