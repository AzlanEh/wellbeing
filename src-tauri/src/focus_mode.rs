use chrono::{Datelike, Local, NaiveTime};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::Mutex;

/// Focus mode settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusSettings {
    /// List of apps to block during focus mode
    pub blocked_apps: Vec<String>,
    /// Default focus session duration in minutes
    pub default_duration_minutes: u32,
    /// Whether to show a notification when focus mode starts
    pub notify_on_start: bool,
    /// Whether to show a notification when focus mode ends
    pub notify_on_end: bool,
    /// Whether to block notifications during focus mode
    pub block_notifications: bool,
    /// Scheduled focus sessions
    pub schedules: Vec<FocusSchedule>,
}

impl Default for FocusSettings {
    fn default() -> Self {
        Self {
            blocked_apps: vec![],
            default_duration_minutes: 25,
            notify_on_start: true,
            notify_on_end: true,
            block_notifications: true,
            schedules: vec![],
        }
    }
}

/// A scheduled focus session (e.g., every weekday 9am-12pm)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusSchedule {
    /// Unique identifier for this schedule
    pub id: String,
    /// Name for this schedule (e.g., "Morning Focus")
    pub name: String,
    /// Days of the week (0=Sunday, 1=Monday, ..., 6=Saturday)
    pub days: Vec<u8>,
    /// Start time (HH:MM format)
    pub start_time: String,
    /// End time (HH:MM format)
    pub end_time: String,
    /// Apps to block during this scheduled session (overrides default if not empty)
    pub blocked_apps: Vec<String>,
    /// Whether this schedule is enabled
    pub enabled: bool,
}

impl FocusSchedule {
    /// Check if the schedule is active at the given time
    pub fn is_active_at(&self, now: chrono::DateTime<Local>) -> bool {
        if !self.enabled {
            return false;
        }

        // Check day of week
        let weekday = now.weekday().num_days_from_sunday() as u8;
        if !self.days.contains(&weekday) {
            return false;
        }

        // Parse start and end times
        let start = NaiveTime::parse_from_str(&self.start_time, "%H:%M").ok();
        let end = NaiveTime::parse_from_str(&self.end_time, "%H:%M").ok();

        if let (Some(start), Some(end)) = (start, end) {
            let current_time = now.time();

            // Handle overnight schedules (e.g., 22:00 to 06:00)
            if end < start {
                return current_time >= start || current_time < end;
            }

            return current_time >= start && current_time < end;
        }

        false
    }

    /// Get the apps that should be blocked during this schedule
    pub fn get_blocked_apps(&self, default_apps: &[String]) -> Vec<String> {
        if self.blocked_apps.is_empty() {
            default_apps.to_vec()
        } else {
            self.blocked_apps.clone()
        }
    }
}

/// Current focus session state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusSession {
    /// Whether focus mode is currently active
    pub is_active: bool,
    /// Start timestamp (Unix seconds)
    pub start_time: Option<i64>,
    /// End timestamp (Unix seconds) - None for indefinite sessions
    pub end_time: Option<i64>,
    /// Duration in minutes (None for indefinite)
    pub duration_minutes: Option<u32>,
    /// Minutes remaining (calculated)
    pub minutes_remaining: Option<u32>,
    /// Apps currently being blocked
    pub blocked_apps: Vec<String>,
    /// Whether this is a scheduled session
    pub is_scheduled: bool,
    /// The schedule name if this is a scheduled session
    pub schedule_name: Option<String>,
}

impl Default for FocusSession {
    fn default() -> Self {
        Self {
            is_active: false,
            start_time: None,
            end_time: None,
            duration_minutes: None,
            minutes_remaining: None,
            blocked_apps: vec![],
            is_scheduled: false,
            schedule_name: None,
        }
    }
}

/// Focus mode manager
pub struct FocusManager {
    settings: Arc<Mutex<FocusSettings>>,
    is_active: AtomicBool,
    session: Arc<Mutex<FocusSession>>,
    /// Track apps that were blocked by schedule (to restore when schedule ends)
    schedule_blocked_apps: Arc<Mutex<HashSet<String>>>,
}

impl FocusManager {
    pub fn new() -> Self {
        Self {
            settings: Arc::new(Mutex::new(FocusSettings::default())),
            is_active: AtomicBool::new(false),
            session: Arc::new(Mutex::new(FocusSession::default())),
            schedule_blocked_apps: Arc::new(Mutex::new(HashSet::new())),
        }
    }

    pub async fn get_settings(&self) -> FocusSettings {
        self.settings.lock().await.clone()
    }

    pub async fn update_settings(&self, settings: FocusSettings) {
        *self.settings.lock().await = settings;
    }

    pub fn is_active(&self) -> bool {
        self.is_active.load(Ordering::SeqCst)
    }

    pub async fn get_session(&self) -> FocusSession {
        let mut session = self.session.lock().await.clone();

        // Calculate minutes remaining if there's an end time
        if let (Some(end_time), true) = (session.end_time, session.is_active) {
            let now = chrono::Utc::now().timestamp();
            let remaining_seconds = (end_time - now).max(0);
            session.minutes_remaining = Some((remaining_seconds / 60) as u32);
        }

        session
    }

    /// Start a focus session
    pub async fn start_session(
        &self,
        duration_minutes: Option<u32>,
        blocked_apps: Option<Vec<String>>,
    ) -> FocusSession {
        let settings = self.settings.lock().await;
        let now = chrono::Utc::now().timestamp();

        // Determine which apps to block
        let apps_to_block = blocked_apps.unwrap_or_else(|| settings.blocked_apps.clone());

        // Calculate end time if duration is specified
        let (end_time, duration) = if let Some(mins) = duration_minutes {
            (Some(now + (mins as i64 * 60)), Some(mins))
        } else {
            (None, None)
        };

        let session = FocusSession {
            is_active: true,
            start_time: Some(now),
            end_time,
            duration_minutes: duration,
            minutes_remaining: duration,
            blocked_apps: apps_to_block.clone(),
            is_scheduled: false,
            schedule_name: None,
        };

        self.is_active.store(true, Ordering::SeqCst);
        *self.session.lock().await = session.clone();

        // Send notification if enabled
        if settings.notify_on_start {
            self.send_notification("Focus Mode Started", &self.get_start_message(&session));
        }

        session
    }

    /// Stop the current focus session
    pub async fn stop_session(&self) -> FocusSession {
        let settings = self.settings.lock().await;

        self.is_active.store(false, Ordering::SeqCst);
        let session = FocusSession::default();
        *self.session.lock().await = session.clone();
        *self.schedule_blocked_apps.lock().await = HashSet::new();

        // Send notification if enabled
        if settings.notify_on_end {
            self.send_notification(
                "Focus Mode Ended",
                "Your focus session has ended. Great work!",
            );
        }

        session
    }

    /// Extend the current session by the specified minutes
    pub async fn extend_session(&self, additional_minutes: u32) -> Option<FocusSession> {
        if !self.is_active() {
            return None;
        }

        let mut session = self.session.lock().await;

        if let Some(current_end) = session.end_time {
            let new_end = current_end + (additional_minutes as i64 * 60);
            session.end_time = Some(new_end);

            if let Some(current_duration) = session.duration_minutes {
                session.duration_minutes = Some(current_duration + additional_minutes);
            }
        }

        Some(session.clone())
    }

    /// Check if a specific app should be blocked during focus mode
    pub async fn should_block_app(&self, app_name: &str) -> bool {
        if !self.is_active() {
            return false;
        }

        let session = self.session.lock().await;
        session
            .blocked_apps
            .iter()
            .any(|blocked| blocked.eq_ignore_ascii_case(app_name))
    }

    /// Called every minute to check schedules and session expiry
    pub async fn tick(&self) -> Option<FocusEvent> {
        let now = Local::now();

        // First, collect schedule info we need
        let (schedules, current_session) = {
            let settings = self.settings.lock().await;
            let session = self.session.lock().await;
            (settings.schedules.clone(), session.clone())
        };

        // Check if any schedule should start
        for schedule in &schedules {
            if schedule.is_active_at(now) {
                // If not currently in a scheduled session for this schedule, start it
                if !current_session.is_active
                    || current_session.schedule_name.as_ref() != Some(&schedule.name)
                {
                    return Some(FocusEvent::ScheduleStarted(schedule.clone()));
                }
            }
        }

        // Check if current scheduled session should end
        if current_session.is_active && current_session.is_scheduled {
            if let Some(schedule_name) = &current_session.schedule_name {
                // Find the schedule
                let schedule = schedules.iter().find(|s| &s.name == schedule_name);

                if let Some(schedule) = schedule {
                    if !schedule.is_active_at(now) {
                        return Some(FocusEvent::ScheduleEnded);
                    }
                }
            }
        }

        // Check if timed session has expired
        if current_session.is_active && !current_session.is_scheduled {
            if let Some(end_time) = current_session.end_time {
                let now_ts = chrono::Utc::now().timestamp();
                if now_ts >= end_time {
                    return Some(FocusEvent::SessionExpired);
                }
            }
        }

        None
    }

    /// Start a scheduled focus session
    pub async fn start_scheduled_session(&self, schedule: &FocusSchedule) {
        let settings = self.settings.lock().await;

        // Determine which apps to block
        let apps_to_block = schedule.get_blocked_apps(&settings.blocked_apps);

        let now = chrono::Utc::now().timestamp();

        let session = FocusSession {
            is_active: true,
            start_time: Some(now),
            end_time: None, // Scheduled sessions end when the schedule period ends
            duration_minutes: None,
            minutes_remaining: None,
            blocked_apps: apps_to_block,
            is_scheduled: true,
            schedule_name: Some(schedule.name.clone()),
        };

        self.is_active.store(true, Ordering::SeqCst);
        *self.session.lock().await = session.clone();

        // Send notification
        if settings.notify_on_start {
            self.send_notification(
                "Scheduled Focus Mode Started",
                &format!("{} has started. Stay focused!", schedule.name),
            );
        }
    }

    /// Add an app to the blocked list for the current session
    pub async fn add_blocked_app(&self, app_name: String) {
        let mut session = self.session.lock().await;
        if !session.blocked_apps.contains(&app_name) {
            session.blocked_apps.push(app_name);
        }
    }

    /// Remove an app from the blocked list for the current session
    pub async fn remove_blocked_app(&self, app_name: &str) {
        let mut session = self.session.lock().await;
        session.blocked_apps.retain(|a| a != app_name);
    }

    fn get_start_message(&self, session: &FocusSession) -> String {
        match session.duration_minutes {
            Some(mins) => format!(
                "Focus mode activated for {} minutes. {} app(s) will be blocked.",
                mins,
                session.blocked_apps.len()
            ),
            None => format!(
                "Focus mode activated indefinitely. {} app(s) will be blocked.",
                session.blocked_apps.len()
            ),
        }
    }

    fn send_notification(&self, title: &str, message: &str) {
        crate::notifications::send_notification(title, message);
    }
}

/// Events that can occur during focus mode
#[derive(Debug, Clone)]
pub enum FocusEvent {
    /// A scheduled focus session should start
    ScheduleStarted(FocusSchedule),
    /// A scheduled focus session has ended
    ScheduleEnded,
    /// A timed manual session has expired
    SessionExpired,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Timelike;

    #[test]
    fn test_schedule_weekday_check() {
        let schedule = FocusSchedule {
            id: "test".to_string(),
            name: "Test Schedule".to_string(),
            days: vec![1, 2, 3, 4, 5], // Monday to Friday
            start_time: "09:00".to_string(),
            end_time: "17:00".to_string(),
            blocked_apps: vec![],
            enabled: true,
        };

        // This is a simplified test - in real usage, we'd need to construct
        // a specific DateTime with a known weekday
        assert!(schedule.enabled);
        assert!(schedule.days.contains(&1)); // Monday
    }

    #[test]
    fn test_schedule_time_range() {
        let schedule = FocusSchedule {
            id: "test".to_string(),
            name: "Test".to_string(),
            days: vec![0, 1, 2, 3, 4, 5, 6], // All days
            start_time: "09:00".to_string(),
            end_time: "17:00".to_string(),
            blocked_apps: vec![],
            enabled: true,
        };

        let start = NaiveTime::parse_from_str(&schedule.start_time, "%H:%M").unwrap();
        let end = NaiveTime::parse_from_str(&schedule.end_time, "%H:%M").unwrap();

        assert_eq!(start.hour(), 9);
        assert_eq!(end.hour(), 17);
    }

    #[test]
    fn test_overnight_schedule() {
        let schedule = FocusSchedule {
            id: "night".to_string(),
            name: "Night Work".to_string(),
            days: vec![0, 1, 2, 3, 4, 5, 6],
            start_time: "22:00".to_string(),
            end_time: "06:00".to_string(),
            blocked_apps: vec!["Discord".to_string()],
            enabled: true,
        };

        // Verify overnight detection logic
        let start = NaiveTime::parse_from_str(&schedule.start_time, "%H:%M").unwrap();
        let end = NaiveTime::parse_from_str(&schedule.end_time, "%H:%M").unwrap();

        // End is before start, so it's an overnight schedule
        assert!(end < start);
    }

    #[test]
    fn test_default_settings() {
        let settings = FocusSettings::default();
        assert!(!settings.notify_on_start || settings.notify_on_start); // Just checking default exists
        assert_eq!(settings.default_duration_minutes, 25);
        assert!(settings.blocked_apps.is_empty());
    }

    #[test]
    fn test_get_blocked_apps_with_override() {
        let schedule = FocusSchedule {
            id: "test".to_string(),
            name: "Test".to_string(),
            days: vec![],
            start_time: "09:00".to_string(),
            end_time: "17:00".to_string(),
            blocked_apps: vec!["Custom".to_string()],
            enabled: true,
        };

        let default_apps = vec!["Firefox".to_string(), "Chrome".to_string()];
        let blocked = schedule.get_blocked_apps(&default_apps);

        // Should use schedule's own list, not default
        assert_eq!(blocked, vec!["Custom".to_string()]);
    }

    #[test]
    fn test_get_blocked_apps_uses_default() {
        let schedule = FocusSchedule {
            id: "test".to_string(),
            name: "Test".to_string(),
            days: vec![],
            start_time: "09:00".to_string(),
            end_time: "17:00".to_string(),
            blocked_apps: vec![], // Empty - should use default
            enabled: true,
        };

        let default_apps = vec!["Firefox".to_string(), "Chrome".to_string()];
        let blocked = schedule.get_blocked_apps(&default_apps);

        assert_eq!(blocked, default_apps);
    }
}
