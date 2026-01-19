use crate::database::Database;
use crate::limit_popup::EmergencyAccessManager;
use crate::window_tracker::{extract_app_name, get_active_window_name};
use std::collections::HashMap;
use std::process::Command;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
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
    /// Emergency access manager for temporary access grants
    emergency_access: Arc<EmergencyAccessManager>,
    /// Tauri app handle for creating windows
    app_handle: Option<AppHandle>,
    /// Track if popup is currently shown for an app (to avoid multiple popups)
    popup_shown_for: Arc<Mutex<Option<String>>>,
}

impl UsageTracker {
    pub fn new(db: Arc<Mutex<Database>>, emergency_access: Arc<EmergencyAccessManager>) -> Self {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        UsageTracker {
            db,
            current_app: Arc::new(Mutex::new(None)),
            current_session_id: Arc::new(Mutex::new(None)),
            session_start: Arc::new(Mutex::new(None)),
            sent_notifications: Arc::new(Mutex::new(HashMap::new())),
            last_reset_date: Arc::new(Mutex::new(today)),
            emergency_access,
            app_handle: None,
            popup_shown_for: Arc::new(Mutex::new(None)),
        }
    }

    /// Set the Tauri app handle for creating windows
    pub fn set_app_handle(&mut self, handle: AppHandle) {
        self.app_handle = Some(handle);
    }

    /// Get a clone of the app handle
    pub fn app_handle_clone(&self) -> Option<AppHandle> {
        self.app_handle.clone()
    }

    /// Get a reference to the emergency access manager
    pub fn emergency_access(&self) -> &Arc<EmergencyAccessManager> {
        &self.emergency_access
    }

    /// Get a clone of the database Arc
    pub fn db_clone(&self) -> Arc<Mutex<Database>> {
        Arc::clone(&self.db)
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
            if app != "Digital Wellbeing" && app != "limit-popup" {
                let db = self.db.lock().await;
                let is_blocked = db.is_app_blocked(app).unwrap_or(false);
                drop(db); // Release lock before further operations

                if is_blocked {
                    // Check if app has emergency access
                    if self.emergency_access.has_active_access(app).await {
                        // Allow the app, emergency access is active
                        tracing::debug!(app = %app, "App has emergency access, allowing");
                    } else {
                        // Show limit popup instead of blocking immediately
                        self.show_limit_popup(app).await;
                    }
                }
            }
        }

        // Clear popup tracking when switching away from blocked app
        if let Some(ref popup_app) = *self.popup_shown_for.lock().await {
            if app_name.as_ref() != Some(popup_app) {
                // User switched to a different app, clear popup state
                *self.popup_shown_for.lock().await = None;
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

    /// Show the limit reached popup window for a blocked app
    async fn show_limit_popup(&self, app_name: &str) {
        // Check if popup is already shown for this app
        {
            let popup_shown = self.popup_shown_for.lock().await;
            if popup_shown.as_ref() == Some(&app_name.to_string()) {
                return; // Popup already shown for this app
            }
        }

        // Mark popup as shown for this app
        {
            let mut popup_shown = self.popup_shown_for.lock().await;
            *popup_shown = Some(app_name.to_string());
        }

        if let Some(ref handle) = self.app_handle {
            // Check if popup window already exists
            if handle.get_webview_window("limit-popup").is_some() {
                // Close existing popup first
                if let Some(window) = handle.get_webview_window("limit-popup") {
                    let _ = window.close();
                }
            }

            // Create URL with app name as query parameter
            let url = format!("/limit-popup?app={}", urlencoding::encode(app_name));

            // Create the popup window
            match WebviewWindowBuilder::new(handle, "limit-popup", WebviewUrl::App(url.into()))
                .title("App Limit Reached")
                .inner_size(420.0, 280.0)
                .resizable(false)
                .decorations(false)
                .always_on_top(true)
                .center()
                .focused(true)
                .build()
            {
                Ok(_) => {
                    tracing::info!(app = %app_name, "Limit popup shown");
                }
                Err(e) => {
                    tracing::error!(error = %e, app = %app_name, "Failed to create limit popup");
                    // Fallback to system notification
                    let _ = self.send_system_notification(
                        &format!("{} blocked", app_name),
                        "Daily time limit exceeded. The app will be closed.",
                    );
                    self.block_app(app_name);
                }
            }
        } else {
            // No app handle, fallback to direct blocking
            tracing::warn!("No app handle available, falling back to direct blocking");
            let _ = self.send_system_notification(
                &format!("{} blocked", app_name),
                "Daily time limit exceeded. The app will be closed.",
            );
            self.block_app(app_name);
        }
    }

    /// Close the limit popup window
    pub fn close_limit_popup(&self) {
        if let Some(ref handle) = self.app_handle {
            if let Some(window) = handle.get_webview_window("limit-popup") {
                let _ = window.close();
            }
        }
    }

    /// Block/close an app (called when user clicks "Quit App" or emergency access expires)
    pub fn block_app(&self, app_name: &str) {
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
