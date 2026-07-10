CREATE TABLE IF NOT EXISTS import_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_date TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  total_fetched INTEGER NOT NULL DEFAULT 0,
  tournaments_after_filter INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_run_id INTEGER NOT NULL,
  limitless_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tournament_date TEXT NOT NULL,
  players INTEGER NOT NULL,
  game TEXT NOT NULL,
  format TEXT NOT NULL,
  organizer_id INTEGER,
  FOREIGN KEY (import_run_id) REFERENCES import_runs(id)
);