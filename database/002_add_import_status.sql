ALTER TABLE import_runs ADD COLUMN status TEXT NOT NULL DEFAULT 'Running';
ALTER TABLE import_runs ADD COLUMN error_message TEXT;
ALTER TABLE import_runs ADD COLUMN elapsed_ms INTEGER;