ALTER TABLE import_runs ADD COLUMN tournaments_inserted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE import_runs ADD COLUMN tournaments_updated INTEGER NOT NULL DEFAULT 0;