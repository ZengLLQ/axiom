# Axiom Database Migration Script
using SQLite
using DBInterface

println("Running Axiom Database Migrations...")
db_path = normpath(joinpath(@__DIR__, "..", "services", "api", "axiom.db"))
db = SQLite.DB(db_path)

DBInterface.execute(db, """
CREATE TABLE IF NOT EXISTS experiments (
    id TEXT PRIMARY KEY,
    project_id TEXT DEFAULT 'default',
    name TEXT NOT NULL,
    equation_id TEXT NOT NULL,
    type TEXT DEFAULT 'forward',
    status TEXT NOT NULL,
    config_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    completed_at TEXT
);
""")

DBInterface.execute(db, """
CREATE TABLE IF NOT EXISTS results (
    experiment_id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    metrics_json TEXT NOT NULL,
    result_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(experiment_id) REFERENCES experiments(id)
);
""")

DBInterface.execute(db, """
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    timestamp TEXT NOT NULL
);
""")

println("Database migration completed. Schema is up-to-date at: $db_path")
