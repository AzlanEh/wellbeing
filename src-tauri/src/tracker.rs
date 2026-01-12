use crate::database::Database;
use crate::window_tracker::{extract_app_name, get_active_window_name};
use std::collections::HashMap;
use std::process::Command;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tokio::time::interval;

/// Notification thresholds
const WARNING_THRESHOLD: f64 = 0.8; // 80% - send warning
const EXCEEDED_THRESHOLD: f64 = 1.0; // 100% - limit exceeded

/// Notification types to track what we've already sent
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
enum NotificationType {
    Warning,  // 80% threshold
    Exceeded, // 100% threshold
}

pub struct UsageTracker {
    db: Arc<Mutex<Database>>,
    current_app: Arc<Mutex<Option<String>>>,
    current_session_id: Arc<Mutex<Option<i64>>>,
    session_start: Arc<Mutex<Option<i64>>>,
    /// Track which notifications have been sent for each app today
    /// Key: (app_name, notification_type), Value: true if sent
    sent_notifications: Arc<Mutex<HashMap<(String, NotificationType), bool>>>,
    /// The date we last reset notifications (to reset daily)
    last_reset_date: Arc<Mutex<String>>,
}

impl UsageTracker {
    pub fn new(db: Arc<Mutex<Database>>) -> Self {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        UsageTracker {
            db,
            current_app: Arc::new(Mutex::new(None)),
            current_session_id: Arc::new(Mutex::new(None)),
            session_start: Arc::new(Mutex::new(None)),
            sent_notifications: Arc::new(Mutex::new(HashMap::new())),
            last_reset_date: Arc::new(Mutex::new(today)),
        }
    }

    pub async fn start_tracking(self: Arc<Self>) {
        let mut ticker = interval(Duration::from_secs(1));
        let mut limit_check_counter: u32 = 0;

        loop {
            ticker.tick().await;

            // Track window every second
            if let Err(e) = self.track_window().await {
                tracing::error!(error = %e, "Error tracking window");
            }

            // Check limits every 10 seconds to reduce overhead
            limit_check_counter += 1;
            if limit_check_counter >= 10 {
                limit_check_counter = 0;
                if let Err(e) = self.check_limits_and_notify().await {
                    tracing::error!(error = %e, "Error checking limits");
                }
            }
        }
    }

    async fn track_window(&self) -> Result<(), String> {
        let window_name = get_active_window_name()?;

        let app_name = match window_name {
            Some(name) => extract_app_name(&name),
            None => None,
        };

        let mut current_app = self.current_app.lock().await;
        let mut current_session_id = self.current_session_id.lock().await;
        let mut session_start = self.session_start.lock().await;

        let now = chrono::Utc::now().timestamp();

        // Check if the current app should be blocked
        if let Some(ref app) = app_name {
            if app != "Digital Wellbeing" {
                let db = self.db.lock().await;
                if db.is_app_blocked(app).unwrap_or(false) {
                    drop(db); // Release lock before blocking
                    self.block_app(app);
                }
            }
        }

        // Check if app changed
        if *current_app != app_name {
            // End previous session if exists
            if let (Some(session_id), Some(_)) = (*current_session_id, *session_start) {
                let db = self.db.lock().await;
                db.update_session_duration(session_id, now)
                    .map_err(|e| format!("Failed to update session: {}", e))?;
            }

            // Start new session if we have an app
            if let Some(ref app) = app_name {
                // Skip tracking our own app
                if app != "Digital Wellbeing" {
                    let db = self.db.lock().await;
                    let app_id = db
                        .get_or_create_app(app, None)
                        .map_err(|e| format!("Failed to get/create app: {}", e))?;

                    let session_id = db
                        .start_session(app_id, now)
                        .map_err(|e| format!("Failed to start session: {}", e))?;

                    *current_session_id = Some(session_id);
                    *session_start = Some(now);
                } else {
                    *current_session_id = None;
                    *session_start = None;
                }
            } else {
                *current_session_id = None;
                *session_start = None;
            }

            *current_app = app_name;
        } else if let Some(session_id) = *current_session_id {
            // Same app, update session duration every 5 seconds for efficiency
            if let Some(start) = *session_start {
                if (now - start) % 5 == 0 {
                    let db = self.db.lock().await;
                    db.update_session_duration(session_id, now)
                        .map_err(|e| format!("Failed to update session: {}", e))?;
                }
            }
        }

        Ok(())
    }

    async fn check_limits_and_notify(&self) -> Result<(), String> {
        // Reset notifications if it's a new day
        self.reset_notifications_if_new_day().await;

        let db = self.db.lock().await;
        let limit_statuses = db
            .get_all_limit_status()
            .map_err(|e| format!("Failed to get limit status: {}", e))?;
        drop(db);

        for (app_name, limit_minutes, used_seconds, _block_when_exceeded) in limit_statuses {
            let limit_seconds = (limit_minutes as i64) * 60;
            if limit_seconds == 0 {
                continue;
            }

            let usage_ratio = used_seconds as f64 / limit_seconds as f64;

            // Check if exceeded (100%)
            if usage_ratio >= EXCEEDED_THRESHOLD {
                self.send_notification_if_not_sent(
                    &app_name,
                    NotificationType::Exceeded,
                    &format!("Time limit exceeded for {}", app_name),
                    &format!(
                        "{} has exceeded its daily limit of {} minutes.",
                        app_name, limit_minutes
                    ),
                )
                .await;
            }
            // Check if approaching (80%)
            else if usage_ratio >= WARNING_THRESHOLD {
                let remaining_minutes = ((limit_seconds - used_seconds) / 60).max(1);
                self.send_notification_if_not_sent(
                    &app_name,
                    NotificationType::Warning,
                    &format!("{} - {} min remaining", app_name, remaining_minutes),
                    &format!("You've used 80% of your daily limit for {}.", app_name),
                )
                .await;
            }
        }

        Ok(())
    }

    async fn reset_notifications_if_new_day(&self) {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let mut last_reset = self.last_reset_date.lock().await;

        if *last_reset != today {
            let mut notifications = self.sent_notifications.lock().await;
            notifications.clear();
            *last_reset = today;
            tracing::info!("Reset notification tracking for new day");
        }
    }

    async fn send_notification_if_not_sent(
        &self,
        app_name: &str,
        notification_type: NotificationType,
        title: &str,
        body: &str,
    ) {
        let key = (app_name.to_string(), notification_type);

        let mut notifications = self.sent_notifications.lock().await;

        if notifications.contains_key(&key) {
            return; // Already sent
        }

        // Send the notification
        if self.send_system_notification(title, body) {
            notifications.insert(key, true);
            tracing::info!(
                notification_type = ?notification_type,
                app = %app_name,
                "Sent notification"
            );
        }
    }

    fn send_system_notification(&self, title: &str, body: &str) -> bool {
        // Use notify-send on Linux (works with most desktop environments)
        #[cfg(target_os = "linux")]
        {
            let result = Command::new("notify-send")
                .args([
                    "--app-name=Digital Wellbeing",
                    "--urgency=normal",
                    "--icon=dialog-warning",
                    title,
                    body,
                ])
                .output();

            match result {
                Ok(output) => {
                    if output.status.success() {
                        return true;
                    }
                    tracing::warn!(
                        stderr = %String::from_utf8_lossy(&output.stderr),
                        "notify-send failed"
                    );
                }
                Err(e) => {
                    tracing::error!(error = %e, "Failed to run notify-send");
                }
            }
        }

        #[cfg(target_os = "macos")]
        {
            let script = format!(
                r#"display notification "{}" with title "{}""#,
                body.replace('"', r#"\""#),
                title.replace('"', r#"\""#)
            );
            let result = Command::new("osascript").args(["-e", &script]).output();

            if let Ok(output) = result {
                if output.status.success() {
                    return true;
                }
            }
        }

        #[cfg(target_os = "windows")]
        {
            // Windows notification via PowerShell
            let script = format!(
                r#"[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$textNodes = $template.GetElementsByTagName("text")
$textNodes.Item(0).AppendChild($template.CreateTextNode("{}")) > $null
$textNodes.Item(1).AppendChild($template.CreateTextNode("{}")) > $null
$toast = [Windows.UI.Notifications.ToastNotification]::new($template)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Digital Wellbeing").Show($toast)"#,
                title.replace('"', r#"\""#),
                body.replace('"', r#"\""#)
            );

            let result = Command::new("powershell")
                .args(["-Command", &script])
                .output();

            if let Ok(output) = result {
                if output.status.success() {
                    return true;
                }
            }
        }

        false
    }

    fn block_app(&self, app_name: &str) {
        #[cfg(target_os = "linux")]
        {
            // Send notification before blocking
            let _ = self.send_system_notification(
                &format!("{} blocked", app_name),
                "Daily time limit exceeded. The app will be closed.",
            );

            // Try to close windows of the app using wmctrl
            let _ = Command::new("wmctrl").args(["-c", app_name]).output();

            // Also try xdotool to close active window if it matches
            let _ = Command::new("xdotool")
                .args(["getactivewindow", "windowclose"])
                .output();
        }

        #[cfg(target_os = "macos")]
        {
            // On macOS, use osascript to quit the app
            let script = format!(r#"tell application "{}" to quit"#, app_name);
            let _ = Command::new("osascript").args(["-e", &script]).output();
        }

        #[cfg(target_os = "windows")]
        {
            // On Windows, use taskkill (less aggressive approach - send SIGTERM)
            let _ = Command::new("taskkill")
                .args(["/IM", &format!("{}.exe", app_name), "/F"])
                .output();
        }
    }
}
