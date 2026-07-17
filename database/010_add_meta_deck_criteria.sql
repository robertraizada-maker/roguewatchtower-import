CREATE TABLE IF NOT EXISTS meta_deck_criteria (
	id TEXT PRIMARY KEY,
	archetype TEXT NOT NULL,
	criteria_json TEXT NOT NULL,
	criteria_text TEXT NOT NULL,
	starts_at TEXT NOT NULL,
	expires_at TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meta_deck_criteria_active_dates
ON meta_deck_criteria (starts_at, expires_at);
