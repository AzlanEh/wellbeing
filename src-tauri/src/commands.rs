use crate::database::AppUsage;
use serde::{Deserialize, Serialize};

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
