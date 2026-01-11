use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::database::{AppLimit, AppUsage, Database};
use crate::theme::{Theme, ThemeLoader};

#[derive(Debug, Serialize, Deserialize)]
pub struct DailyStats {
    pub total_seconds: i64,
    pub apps: Vec<AppUsage>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WeeklyStats {
    pub days: Vec<DayStats>,
    pub total_seconds: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DayStats {
    pub date: String,
    pub timestamp: i64,
    pub total_seconds: i64,
}

pub struct Commands {
    pub db: Arc<Mutex<Database>>,
}

impl Commands {
    pub fn new(db: Arc<Mutex<Database>>) -> Self {
        Commands { db }
    }

    pub async fn get_daily_usage(&self) -> Result<DailyStats, String> {
        let db = self.db.lock().await;
        let apps = db.get_daily_usage()
            .map_err(|e| format!("Failed to get daily usage: {}", e))?;

        let total_seconds: i64 = apps.iter().map(|a| a.duration_seconds).sum();

        Ok(DailyStats {
            total_seconds,
            apps,
        })
    }

    pub async fn get_weekly_stats(&self) -> Result<WeeklyStats, String> {
        let db = self.db.lock().await;
        let raw_stats = db.get_weekly_stats()
            .map_err(|e| format!("Failed to get weekly stats: {}", e))?;

        let days: Vec<DayStats> = raw_stats.iter().map(|(timestamp, seconds)| {
            let date = chrono::DateTime::from_timestamp(*timestamp, 0)
                .unwrap()
                .format("%Y-%m-%d")
                .to_string();

            DayStats {
                date,
                timestamp: *timestamp,
                total_seconds: *seconds,
            }
        }).collect();

        let total_seconds: i64 = days.iter().map(|d| d.total_seconds).sum();

        Ok(WeeklyStats {
            days,
            total_seconds,
        })
    }

    pub async fn set_app_limit(&self, app_name: String, minutes: i32) -> Result<(), String> {
        let db = self.db.lock().await;
        db.set_limit(&app_name, minutes)
            .map_err(|e| format!("Failed to set limit: {}", e))
    }

    pub async fn get_app_limits(&self) -> Result<Vec<AppLimit>, String> {
        let db = self.db.lock().await;
        db.get_all_limits()
            .map_err(|e| format!("Failed to get limits: {}", e))
    }

    pub async fn remove_app_limit(&self, app_name: String) -> Result<(), String> {
        let db = self.db.lock().await;
        db.remove_limit(&app_name)
            .map_err(|e| format!("Failed to remove limit: {}", e))
    }

    pub fn get_theme(&self) -> Theme {
        ThemeLoader::load()
    }

    pub fn get_theme_path(&self) -> Option<String> {
        ThemeLoader::get_theme_path().map(|p| p.to_string_lossy().to_string())
    }
}