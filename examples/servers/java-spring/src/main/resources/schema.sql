CREATE TABLE IF NOT EXISTS configs (
    name       TEXT PRIMARY KEY,
    config     TEXT NOT NULL,
    created_at TEXT,
    updated_at TEXT
);
