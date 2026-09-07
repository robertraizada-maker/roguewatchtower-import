CREATE TABLE IF NOT EXISTS ranking_snapshots (
    report_date TEXT PRIMARY KEY,
    decks_json TEXT NOT NULL CHECK (json_valid(decks_json)),
    calculated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
