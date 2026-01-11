use rusqlite::{Connection, Result as SqliteResult, OptionalExtension};
use std::path::PathBuf;
use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct App {
    pub id: i64,
    pub name: String,
    pub path: Option<String>,
    pub icon_path: Option<String>,
    pub category: Option<String>,
    pub is_blocked: bool,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HourlyUsage {
    pub hour: i32,
    pub total_seconds: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryUsage {
    pub category: String,
    pub total_seconds: i64,
    pub app_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageSession {
    pub id: i64,
    pub app_id: i64,
    pub app_name: String,
    pub start_time: i64,
    pub end_time: i64,
    pub duration_seconds: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppLimit {
    pub id: i64,
    pub app_id: i64,
    pub app_name: String,
    pub daily_limit_minutes: i32,
    pub block_when_exceeded: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppUsage {
    pub app_name: String,
    pub duration_seconds: i64,
    pub session_count: i64,
    pub category: Option<String>,
}

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(db_path: PathBuf) -> SqliteResult<Self> {
        let conn = Connection::open(db_path)?;
        let db = Database { conn };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> SqliteResult<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS apps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                path TEXT,
                icon_path TEXT,
                category TEXT,
                is_blocked INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS usage_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                app_id INTEGER NOT NULL,
                start_time INTEGER NOT NULL,
                end_time INTEGER NOT NULL,
                duration_seconds INTEGER NOT NULL,
                FOREIGN KEY (app_id) REFERENCES apps(id)
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS app_limits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                app_id INTEGER NOT NULL UNIQUE,
                daily_limit_minutes INTEGER NOT NULL,
                block_when_exceeded INTEGER DEFAULT 0,
                FOREIGN KEY (app_id) REFERENCES apps(id)
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_sessions_app_start ON usage_sessions(app_id, start_time)",
            [],
        )?;

        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_sessions_date ON usage_sessions(start_time)",
            [],
        )?;
        
        // Add new columns if they don't exist (migration)
        let _ = self.conn.execute("ALTER TABLE apps ADD COLUMN category TEXT", []);
        let _ = self.conn.execute("ALTER TABLE apps ADD COLUMN is_blocked INTEGER DEFAULT 0", []);
        let _ = self.conn.execute("ALTER TABLE app_limits ADD COLUMN block_when_exceeded INTEGER DEFAULT 0", []);

        Ok(())
    }

    pub fn get_or_create_app(&self, name: &str, path: Option<String>) -> SqliteResult<i64> {
        if let Some(row) = self.conn.query_row(
            "SELECT id FROM apps WHERE name = ?1",
            &[name],
            |row| row.get(0),
        ).ok() {
            return Ok(row);
        }

        self.conn.execute(
            "INSERT INTO apps (name, path) VALUES (?1, ?2)",
            &[name, &path.unwrap_or_default()],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    /// Records a usage session atomically using a transaction.
    /// This ensures either all operations succeed or none do.
    pub fn record_usage_atomic(&mut self, app_name: &str, duration_seconds: i64) -> SqliteResult<()> {
        let tx = self.conn.transaction()?;
        
        // Get or create app
        let app_id: i64 = match tx.query_row(
            "SELECT id FROM apps WHERE name = ?1",
            &[app_name],
            |row| row.get(0),
        ) {
            Ok(id) => id,
            Err(_) => {
                tx.execute(
                    "INSERT INTO apps (name, path) VALUES (?1, ?2)",
                    &[app_name, ""],
                )?;
                tx.last_insert_rowid()
            }
        };

        let now = Utc::now().timestamp();
        let start_time = now - duration_seconds;

        // Create session with all data at once
        tx.execute(
            "INSERT INTO usage_sessions (app_id, start_time, end_time, duration_seconds) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![app_id, start_time, now, duration_seconds],
        )?;

        tx.commit()
    }

    pub fn start_session(&self, app_id: i64, start_time: i64) -> SqliteResult<i64> {
        self.conn.execute(
            "INSERT INTO usage_sessions (app_id, start_time, end_time, duration_seconds) VALUES (?1, ?2, ?2, 0)",
            rusqlite::params![app_id, start_time],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn end_session(&self, session_id: i64, end_time: i64) -> SqliteResult<()> {
        let duration: i64 = self.conn.query_row(
            "SELECT start_time FROM usage_sessions WHERE id = ?1",
            rusqlite::params![session_id],
            |row| {
                let start_time: i64 = row.get(0)?;
                Ok(end_time - start_time)
            },
        )?;

        self.conn.execute(
            "UPDATE usage_sessions SET end_time = ?1, duration_seconds = ?2 WHERE id = ?3",
            rusqlite::params![end_time, duration, session_id],
        )?;

        Ok(())
    }

    pub fn update_session_duration(&self, session_id: i64, end_time: i64) -> SqliteResult<()> {
        self.conn.execute(
            "UPDATE usage_sessions SET end_time = ?1, duration_seconds = ?1 - start_time WHERE id = ?2",
            rusqlite::params![end_time, session_id],
        )?;
        Ok(())
    }

    pub fn get_usage_today(&self, app_name: &str) -> SqliteResult<i64> {
        // Use SQLite's local time calculation for start of day
        self.conn.query_row(
            "SELECT COALESCE(SUM(us.duration_seconds), 0) FROM usage_sessions us
             JOIN apps a ON us.app_id = a.id
             WHERE a.name = ?1 AND date(us.start_time, 'unixepoch', 'localtime') = date('now', 'localtime')",
            rusqlite::params![app_name],
            |row| row.get(0),
        )
    }

    pub fn get_daily_usage(&self) -> SqliteResult<Vec<AppUsage>> {
        // Use SQLite's local time calculation
        let mut stmt = self.conn.prepare(
            "SELECT a.name, COALESCE(SUM(us.duration_seconds), 0), COUNT(us.id), a.category
             FROM apps a
             LEFT JOIN usage_sessions us ON a.id = us.app_id 
                AND date(us.start_time, 'unixepoch', 'localtime') = date('now', 'localtime')
             GROUP BY a.id
             HAVING SUM(us.duration_seconds) > 0
             ORDER BY SUM(us.duration_seconds) DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(AppUsage {
                app_name: row.get(0)?,
                duration_seconds: row.get(1)?,
                session_count: row.get(2)?,
                category: row.get(3)?,
            })
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    pub fn get_weekly_stats(&self) -> SqliteResult<Vec<(i64, i64)>> {
        let week_ago = Utc::now().timestamp() - (7 * 24 * 60 * 60);

        let mut stmt = self.conn.prepare(
            "SELECT DATE(start_time, 'unixepoch', 'localtime') as day, SUM(duration_seconds)
             FROM usage_sessions
             WHERE start_time >= ?1
             GROUP BY day
             ORDER BY day ASC",
        )?;

        let rows = stmt.query_map([week_ago], |row| {
            let day_str: String = row.get(0)?;
            // Parse the date string, falling back to current time if parsing fails
            let day = chrono::NaiveDate::parse_from_str(&day_str, "%Y-%m-%d")
                .ok()
                .and_then(|d| d.and_hms_opt(12, 0, 0))  // Use noon to avoid timezone edge cases
                .map(|dt| dt.and_utc().timestamp())
                .unwrap_or_else(|| Utc::now().timestamp());
            Ok((day, row.get(1)?))
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    pub fn set_limit(&self, app_name: &str, minutes: i32) -> SqliteResult<()> {
        let app_id = self.get_or_create_app(app_name, None)?;
        self.conn.execute(
            "INSERT OR REPLACE INTO app_limits (app_id, daily_limit_minutes) VALUES (?1, ?2)",
            rusqlite::params![app_id, minutes as i64],
        )?;
        Ok(())
    }

    pub fn get_limit(&self, app_name: &str) -> SqliteResult<Option<i32>> {
        self.conn.query_row(
            "SELECT al.daily_limit_minutes FROM app_limits al
             JOIN apps a ON al.app_id = a.id
             WHERE a.name = ?1",
            &[app_name],
            |row| row.get(0),
        ).optional()
    }

    pub fn get_all_limits(&self) -> SqliteResult<Vec<AppLimit>> {
        let mut stmt = self.conn.prepare(
            "SELECT al.id, al.app_id, a.name, al.daily_limit_minutes, COALESCE(al.block_when_exceeded, 0)
             FROM app_limits al
             JOIN apps a ON al.app_id = a.id",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(AppLimit {
                id: row.get(0)?,
                app_id: row.get(1)?,
                app_name: row.get(2)?,
                daily_limit_minutes: row.get(3)?,
                block_when_exceeded: row.get::<_, i32>(4)? != 0,
            })
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    pub fn remove_limit(&self, app_name: &str) -> SqliteResult<()> {
        self.conn.execute(
            "DELETE FROM app_limits WHERE app_id = (SELECT id FROM apps WHERE name = ?1)",
            &[app_name],
        )?;
        Ok(())
    }

    pub fn set_limit_with_block(&self, app_name: &str, minutes: i32, block_when_exceeded: bool) -> SqliteResult<()> {
        let app_id = self.get_or_create_app(app_name, None)?;
        self.conn.execute(
            "INSERT OR REPLACE INTO app_limits (app_id, daily_limit_minutes, block_when_exceeded) VALUES (?1, ?2, ?3)",
            rusqlite::params![app_id, minutes as i64, block_when_exceeded as i32],
        )?;
        Ok(())
    }

    pub fn set_app_category(&self, app_name: &str, category: &str) -> SqliteResult<()> {
        self.conn.execute(
            "UPDATE apps SET category = ?1 WHERE name = ?2",
            rusqlite::params![category, app_name],
        )?;
        Ok(())
    }

    pub fn get_hourly_usage(&self) -> SqliteResult<Vec<HourlyUsage>> {
        let mut stmt = self.conn.prepare(
            "SELECT CAST(strftime('%H', start_time, 'unixepoch', 'localtime') AS INTEGER) as hour, 
                    SUM(duration_seconds) as total
             FROM usage_sessions
             WHERE date(start_time, 'unixepoch', 'localtime') = date('now', 'localtime')
             GROUP BY hour
             ORDER BY hour ASC",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(HourlyUsage {
                hour: row.get(0)?,
                total_seconds: row.get(1)?,
            })
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    pub fn get_category_usage(&self) -> SqliteResult<Vec<CategoryUsage>> {
        let mut stmt = self.conn.prepare(
            "SELECT COALESCE(a.category, 'Uncategorized') as category, 
                    SUM(us.duration_seconds) as total,
                    COUNT(DISTINCT a.id) as app_count
             FROM usage_sessions us
             JOIN apps a ON us.app_id = a.id
             WHERE date(us.start_time, 'unixepoch', 'localtime') = date('now', 'localtime')
             GROUP BY COALESCE(a.category, 'Uncategorized')
             ORDER BY total DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(CategoryUsage {
                category: row.get(0)?,
                total_seconds: row.get(1)?,
                app_count: row.get(2)?,
            })
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    pub fn is_app_blocked(&self, app_name: &str) -> SqliteResult<bool> {
        // Check if app has a limit with blocking enabled and usage exceeded
        let result: Option<(i32, i64)> = self.conn.query_row(
            "SELECT al.daily_limit_minutes, COALESCE(SUM(us.duration_seconds), 0)
             FROM apps a
             JOIN app_limits al ON a.id = al.app_id AND al.block_when_exceeded = 1
             LEFT JOIN usage_sessions us ON a.id = us.app_id 
                AND date(us.start_time, 'unixepoch', 'localtime') = date('now', 'localtime')
             WHERE a.name = ?1
             GROUP BY a.id",
            rusqlite::params![app_name],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).optional()?;

        if let Some((limit_minutes, used_seconds)) = result {
            let limit_seconds = (limit_minutes as i64) * 60;
            return Ok(used_seconds >= limit_seconds);
        }

        Ok(false)
    }

    pub fn get_all_apps(&self) -> SqliteResult<Vec<App>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, path, icon_path, category, COALESCE(is_blocked, 0), created_at FROM apps"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(App {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                icon_path: row.get(3)?,
                category: row.get(4)?,
                is_blocked: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
            })
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    /// Get limit status for all apps with limits set
    /// Returns: (app_name, limit_minutes, used_seconds, block_when_exceeded)
    pub fn get_all_limit_status(&self) -> SqliteResult<Vec<(String, i32, i64, bool)>> {
        let mut stmt = self.conn.prepare(
            "SELECT a.name, al.daily_limit_minutes, COALESCE(SUM(us.duration_seconds), 0), al.block_when_exceeded
             FROM apps a
             JOIN app_limits al ON a.id = al.app_id
             LEFT JOIN usage_sessions us ON a.id = us.app_id 
                AND date(us.start_time, 'unixepoch', 'localtime') = date('now', 'localtime')
             GROUP BY a.id",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i32>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, i32>(3)? != 0,
            ))
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }
}