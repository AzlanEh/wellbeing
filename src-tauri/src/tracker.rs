use crate::database::Database;
use crate::limit_popup::EmergencyAccessManager;
use crate::notification_settings::NotificationManager;
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
const IDLE_THRESHOLD_SECONDS: u64 = 300; // 5 minutes

/// How often (in seconds) to flush session duration to DB
const SESSION_FLUSH_INTERVAL: u32 = 5;

/// Maximum number of failed writes to buffer before dropping oldest
const MAX_RETRY_BUFFER_SIZE: usize = 100;

/// Notification types to track what we've already sent
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
enum NotificationType {
    Warning,  // 80% threshold
    Exceeded, // 100% threshold
}

/// A pending DB operation that failed and needs retry
#[derive(Debug, Clone)]
#[allow(dead_code)]
enum PendingWrite {
    /// Update session duration: (session_id, end_time)
    UpdateSession { session_id: i64, end_time: i64 },
    /// Record a complete session atomically: (app_name, duration_seconds)
    RecordSession {
        app_name: String,
        duration_seconds: i64,
    },
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
    /// Notification manager for DND/mute-aware notifications
    notification_manager: Option<Arc<NotificationManager>>,
    /// Tauri app handle for creating windows
    app_handle: Option<AppHandle>,
    /// Track if popup is currently shown for an app (to avoid multiple popups)
    popup_shown_for: Arc<Mutex<Option<String>>>,
    /// Counter for session flush interval (avoids unreliable modulo on timestamps)
    flush_counter: Arc<Mutex<u32>>,
    /// Buffer of failed DB writes to retry
    retry_buffer: Arc<Mutex<Vec<PendingWrite>>>,
    /// Track the last successfully written end_time to detect data gaps
    last_written_end_time: Arc<Mutex<Option<i64>>>,
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
            notification_manager: None,
            app_handle: None,
            popup_shown_for: Arc::new(Mutex::new(None)),
            flush_counter: Arc::new(Mutex::new(0)),
            retry_buffer: Arc::new(Mutex::new(Vec::new())),
            last_written_end_time: Arc::new(Mutex::new(None)),
        }
    }

    /// Set the Tauri app handle for creating windows
    pub fn set_app_handle(&mut self, handle: AppHandle) {
        self.app_handle = Some(handle);
    }

    /// Set the notification manager for DND/mute-aware notifications
    pub fn set_notification_manager(&mut self, manager: Arc<NotificationManager>) {
        self.notification_manager = Some(manager);
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

            // Retry any buffered failed writes first
            self.retry_pending_writes().await;

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

    /// Finalize the current session (flush duration to DB).
    /// Call this on graceful shutdown to avoid losing the last session's data.
    pub async fn finalize_current_session(&self) {
        let current_session_id = self.current_session_id.lock().await;
        let session_start = self.session_start.lock().await;

        if let (Some(session_id), Some(_start)) = (*current_session_id, *session_start) {
            let now = chrono::Utc::now().timestamp();
            let db = self.db.lock().await;
            if let Err(e) = db.update_session_duration(session_id, now) {
                tracing::error!(
                    error = %e,
                    session_id = session_id,
                    "Failed to finalize session on shutdown"
                );
                // Buffer for retry on next startup (best effort)
                drop(db);
                drop(session_start);
                drop(current_session_id);
                self.buffer_failed_write(PendingWrite::UpdateSession {
                    session_id,
                    end_time: now,
                })
                .await;
            } else {
                tracing::info!(
                    session_id = session_id,
                    "Finalized current session on shutdown"
                );
            }
        }
    }

    /// Buffer a failed write for later retry
    async fn buffer_failed_write(&self, write: PendingWrite) {
        let mut buffer = self.retry_buffer.lock().await;
        if buffer.len() >= MAX_RETRY_BUFFER_SIZE {
            // Drop the oldest entry to make room
            let dropped = buffer.remove(0);
            tracing::warn!(
                dropped = ?dropped,
                "Retry buffer full, dropping oldest pending write"
            );
        }
        tracing::debug!(write = ?write, "Buffering failed DB write for retry");
        buffer.push(write);
    }

    /// Retry all buffered failed writes
    async fn retry_pending_writes(&self) {
        let mut buffer = self.retry_buffer.lock().await;
        if buffer.is_empty() {
            return;
        }

        let db = self.db.lock().await;
        let mut still_pending = Vec::new();

        for write in buffer.drain(..) {
            match &write {
                PendingWrite::UpdateSession {
                    session_id,
                    end_time,
                } => {
                    if let Err(e) = db.update_session_duration(*session_id, *end_time) {
                        tracing::warn!(
                            error = %e,
                            session_id = session_id,
                            "Retry failed for session update"
                        );
                        still_pending.push(write);
                    } else {
                        tracing::info!(session_id = session_id, "Retried session update succeeded");
                    }
                }
                PendingWrite::RecordSession {
                    app_name,
                    duration_seconds,
                } => {
                    // We need a &mut Database for record_usage_atomic, but we only have &Database
                    // through the lock. Instead, use update_session_duration pattern.
                    // For now, log and drop - this path is less common.
                    tracing::warn!(
                        app = %app_name,
                        duration = duration_seconds,
                        "Cannot retry atomic record (requires mut db), dropping"
                    );
                }
            }
        }

        *buffer = still_pending;
    }

    async fn track_window(&self) -> Result<(), String> {
        let mut window_name = get_active_window_name()?;

        // Check for idle - platform-specific behavior
        let idle_seconds = get_idle_seconds();

        if idle_seconds >= IDLE_THRESHOLD_SECONDS {
            // User is idle, treat as no active window to stop tracking
            window_name = None;
        }

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
        // Use a single lock acquisition to avoid potential deadlock
        {
            let mut popup_shown = self.popup_shown_for.lock().await;
            if let Some(ref popup_app) = *popup_shown {
                if app_name.as_ref() != Some(popup_app) {
                    *popup_shown = None;
                }
            }
        }

        // Check if app changed
        if *current_app != app_name {
            // End previous session if exists
            if let (Some(session_id), Some(_)) = (*current_session_id, *session_start) {
                if let Err(e) = self.write_session_duration(session_id, now).await {
                    tracing::error!(error = %e, session_id, "Failed to end session");
                }
            }

            // Reset flush counter on app switch
            *self.flush_counter.lock().await = 0;

            // Start new session if we have an app
            if let Some(ref app) = app_name {
                // Skip tracking our own app
                if app != "Digital Wellbeing" {
                    let db = self.db.lock().await;
                    match db.get_or_create_app(app, None) {
                        Ok(app_id) => match db.start_session(app_id, now) {
                            Ok(session_id) => {
                                *current_session_id = Some(session_id);
                                *session_start = Some(now);
                            }
                            Err(e) => {
                                tracing::error!(error = %e, app = %app, "Failed to start session");
                                *current_session_id = None;
                                *session_start = None;
                            }
                        },
                        Err(e) => {
                            tracing::error!(error = %e, app = %app, "Failed to get/create app");
                            *current_session_id = None;
                            *session_start = None;
                        }
                    }
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
            // Same app - use counter-based flush instead of unreliable modulo on timestamps
            let mut counter = self.flush_counter.lock().await;
            *counter += 1;
            if *counter >= SESSION_FLUSH_INTERVAL {
                *counter = 0;
                if let Err(e) = self.write_session_duration(session_id, now).await {
                    tracing::error!(error = %e, session_id, "Failed to update session duration");
                }
            }
        }

        Ok(())
    }

    /// Write session duration to DB with retry buffering on failure
    async fn write_session_duration(&self, session_id: i64, end_time: i64) -> Result<(), String> {
        let db = self.db.lock().await;
        match db.update_session_duration(session_id, end_time) {
            Ok(()) => {
                *self.last_written_end_time.lock().await = Some(end_time);
                Ok(())
            }
            Err(e) => {
                let err_msg = format!("Failed to update session: {}", e);
                drop(db);
                // Buffer for retry
                self.buffer_failed_write(PendingWrite::UpdateSession {
                    session_id,
                    end_time,
                })
                .await;
                Err(err_msg)
            }
        }
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

        // Send the notification (respecting DND/mute settings)
        if self.send_system_notification(title, body).await {
            notifications.insert(key, true);
            tracing::info!(
                notification_type = ?notification_type,
                app = %app_name,
                "Sent notification"
            );
        }
    }

    /// Send a notification, respecting NotificationManager DND/mute settings if available
    async fn send_system_notification(&self, title: &str, body: &str) -> bool {
        if let Some(ref manager) = self.notification_manager {
            // Use the notification manager which respects DND and mute settings
            match manager.send_notification(title, body, "normal").await {
                Ok(()) => true,
                Err(e) => {
                    tracing::debug!(error = %e, "Notification suppressed or failed");
                    false
                }
            }
        } else {
            // Fallback: direct send (background mode without notification manager)
            crate::notifications::send_notification(title, body)
        }
    }

    /// Show the limit reached popup window for a blocked app
    async fn show_limit_popup(&self, app_name: &str) {
        // Check if popup is already shown for this app (single lock acquisition)
        {
            let mut popup_shown = self.popup_shown_for.lock().await;
            if popup_shown.as_ref() == Some(&app_name.to_string()) {
                return; // Popup already shown for this app
            }
            // Mark popup as shown for this app
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
                    let _ = self
                        .send_system_notification(
                            &format!("{} blocked", app_name),
                            "Daily time limit exceeded. The app will be closed.",
                        )
                        .await;
                    self.block_app(app_name);
                }
            }
        } else {
            // No app handle, fallback to direct blocking
            tracing::warn!("No app handle available, falling back to direct blocking");
            let _ = self
                .send_system_notification(
                    &format!("{} blocked", app_name),
                    "Daily time limit exceeded. The app will be closed.",
                )
                .await;
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
            // Send notification before blocking (fire-and-forget, don't await)
            let _ = crate::notifications::send_notification(
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

/// Get user idle time in seconds, cross-platform.
///
/// - Linux (X11): uses `user-idle` crate (requires libxss)
/// - Linux (Wayland): uses logind DBus IdleHint for idle detection
/// - Windows/macOS: uses `user-idle` crate natively
fn get_idle_seconds() -> u64 {
    #[cfg(target_os = "linux")]
    {
        let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok()
            || std::env::var("XDG_SESSION_TYPE").unwrap_or_default() == "wayland";
        if is_wayland {
            return get_idle_seconds_wayland();
        }
    }

    match user_idle::UserIdle::get_time() {
        Ok(idle) => idle.as_seconds(),
        Err(e) => {
            tracing::trace!("Failed to get idle time: {}", e);
            0
        }
    }
}

/// Wayland idle detection via logind DBus IdleHint.
///
/// Calls `loginctl show-session self -p IdleSinceHint --value` to get the
/// monotonic timestamp (in microseconds) when the session became idle.
/// Falls back to `IdleHint` boolean if the timestamp approach fails.
#[cfg(target_os = "linux")]
fn get_idle_seconds_wayland() -> u64 {
    use std::process::Command;
    use std::time::SystemTime;

    // First try: get IdleSinceHint (microseconds since epoch of idle start)
    if let Ok(output) = Command::new("busctl")
        .args([
            "--user",
            "get-property",
            "org.freedesktop.login1",
            "/org/freedesktop/login1/session/auto",
            "org.freedesktop.login1.Session",
            "IdleSinceHint",
        ])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            // Output format: "t <microseconds>\n"
            if let Some(value) = stdout.trim().strip_prefix("t ") {
                if let Ok(idle_since_us) = value.parse::<u64>() {
                    if idle_since_us == 0 {
                        // 0 means not idle
                        return 0;
                    }
                    // Convert to seconds since epoch and compare to now
                    if let Ok(now) = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH) {
                        let now_us = now.as_micros() as u64;
                        if now_us > idle_since_us {
                            return (now_us - idle_since_us) / 1_000_000;
                        }
                    }
                }
            }
        }
    }

    // Fallback: just check the boolean IdleHint
    if let Ok(output) = Command::new("busctl")
        .args([
            "--user",
            "get-property",
            "org.freedesktop.login1",
            "/org/freedesktop/login1/session/auto",
            "org.freedesktop.login1.Session",
            "IdleHint",
        ])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            // Output format: "b true\n" or "b false\n"
            if stdout.contains("true") {
                // We know user is idle but don't know for how long.
                // Return the threshold + 1 to trigger idle detection.
                return IDLE_THRESHOLD_SECONDS + 1;
            }
            return 0;
        }
    }

    // If all methods fail, assume active (conservative - better to over-track than miss data)
    tracing::trace!("Wayland idle detection failed, assuming active");
    0
}
