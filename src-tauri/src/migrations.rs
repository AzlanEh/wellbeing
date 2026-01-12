//! Database migration system for Wellbeing app
//!
//! This module provides a simple version-based migration system that tracks
//! schema changes and applies them incrementally.

use rusqlite::{Connection, Result as SqliteResult};

/// Current schema version - increment this when adding new migrations
pub const SCHEMA_VERSION: i64 = 2;

/// Represents a single migration
struct Migration {
    version: i64,
    description: &'static str,
    sql: &'static str,
}

/// Get all migrations in order
fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "Add category and is_blocked to apps, block_when_exceeded to app_limits",
            sql: "
                -- These are idempotent, SQLite will error if column exists but we ignore it
                ALTER TABLE apps ADD COLUMN category TEXT;
                ALTER TABLE apps ADD COLUMN is_blocked INTEGER DEFAULT 0;
                ALTER TABLE app_limits ADD COLUMN block_when_exceeded INTEGER DEFAULT 0;
            ",
        },
        Migration {
            version: 2,
            description: "Add indexes for better query performance",
            sql: "
                CREATE INDEX IF NOT EXISTS idx_apps_name ON apps(name);
                CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
                CREATE INDEX IF NOT EXISTS idx_sessions_app_start ON usage_sessions(app_id, start_time);
                CREATE INDEX IF NOT EXISTS idx_sessions_date ON usage_sessions(start_time);
            ",
        },
        // Future migrations go here:
        // Migration {
        //     version: 3,
        //     description: "Add weekly goals table",
        //     sql: "CREATE TABLE IF NOT EXISTS weekly_goals (...)",
        // },
    ]
}

/// Initialize the schema_version table if it doesn't exist
fn init_version_table(conn: &Connection) -> SqliteResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at INTEGER DEFAULT (strftime('%s', 'now')),
            description TEXT
        )",
        [],
    )?;
    Ok(())
}

/// Get the current schema version from the database
fn get_current_version(conn: &Connection) -> SqliteResult<i64> {
    conn.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_version",
        [],
        |row| row.get(0),
    )
}

/// Record that a migration was applied
fn record_migration(conn: &Connection, version: i64, description: &str) -> SqliteResult<()> {
    conn.execute(
        "INSERT INTO schema_version (version, description) VALUES (?1, ?2)",
        rusqlite::params![version, description],
    )?;
    Ok(())
}

/// Run all pending migrations
///
/// This function:
/// 1. Creates the schema_version table if needed
/// 2. Checks current version
/// 3. Applies any migrations newer than current version
/// 4. Records each successful migration
pub fn run_migrations(conn: &Connection) -> SqliteResult<u32> {
    init_version_table(conn)?;

    let current_version = get_current_version(conn)?;
    let migrations = get_migrations();
    let mut applied_count = 0u32;

    tracing::info!(
        current_version = current_version,
        target_version = SCHEMA_VERSION,
        "Checking database migrations"
    );

    for migration in migrations {
        if migration.version <= current_version {
            continue;
        }

        tracing::info!(
            version = migration.version,
            description = migration.description,
            "Applying migration"
        );

        // Split SQL by semicolons and execute each statement
        // This allows multiple statements in one migration
        for statement in migration.sql.split(';') {
            let statement = statement.trim();
            if statement.is_empty() || statement.starts_with("--") {
                continue;
            }

            // Try to execute, but don't fail on "column already exists" errors
            // which happen when ALTER TABLE tries to add an existing column
            match conn.execute(statement, []) {
                Ok(_) => {}
                Err(e) => {
                    let error_msg = e.to_string();
                    // SQLite error for duplicate column: "duplicate column name"
                    if error_msg.contains("duplicate column") {
                        tracing::debug!(statement = statement, "Skipping: column already exists");
                    } else {
                        return Err(e);
                    }
                }
            }
        }

        record_migration(conn, migration.version, migration.description)?;
        applied_count += 1;

        tracing::info!(
            version = migration.version,
            "Migration applied successfully"
        );
    }

    if applied_count > 0 {
        tracing::info!(
            migrations_applied = applied_count,
            "Database migrations complete"
        );
    }

    Ok(applied_count)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migrations_are_ordered() {
        let migrations = get_migrations();
        for i in 1..migrations.len() {
            assert!(
                migrations[i].version > migrations[i - 1].version,
                "Migration versions must be strictly increasing"
            );
        }
    }

    #[test]
    fn test_schema_version_matches() {
        let migrations = get_migrations();
        if let Some(last) = migrations.last() {
            assert_eq!(
                last.version, SCHEMA_VERSION,
                "SCHEMA_VERSION should match the latest migration version"
            );
        }
    }
}
