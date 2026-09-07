CREATE INDEX IF NOT EXISTS idx_tournaments_tournament_date
ON tournaments(tournament_date);

CREATE INDEX IF NOT EXISTS idx_import_runs_status_report_date
ON import_runs(status, report_date DESC);

PRAGMA optimize;