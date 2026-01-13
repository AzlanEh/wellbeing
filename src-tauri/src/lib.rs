mod app_scanner;
mod autostart;
mod break_reminder;
mod commands;
mod database;
mod error;
mod focus_mode;
mod goals;
mod migrations;
mod notification_settings;
mod theme;
mod tracker;
mod tray;
mod window_tracker;

use app_scanner::InstalledApp;
use autostart::AutostartStatus;
use break_reminder::{BreakReminder, BreakSettings};
use commands::{DailyStats, DayStats, WeeklyStats};
use database::{AppLimit, AppUsage, CategoryUsage, Database, ExportRecord, HourlyUsage};
use error::WellbeingError;
use focus_mode::{FocusManager, FocusSession, FocusSettings};
use goals::{Achievement, Goal, GoalProgress, GoalsState};
use notification_settings::{NotificationManager, NotificationSettings};
use std::collections::HashMap;
use std::process::Command;
use std::sync::Arc;
use tauri::State;
use theme::{Theme, ThemeLoader};
use tokio::sync::Mutex;
use tracker::UsageTracker;

type CmdResult<T> = Result<T, WellbeingError>;

pub struct AppState {
    pub db: Arc<Mutex<Database>>,
    pub break_reminder: Arc<BreakReminder>,
    pub notification_manager: Arc<NotificationManager>,
    pub focus_manager: Arc<FocusManager>,
    pub goals_state: Arc<Mutex<GoalsState>>,
}

#[tauri::command]
async fn get_daily_usage(state: State<'_, AppState>) -> CmdResult<DailyStats> {
    let db = state.db.lock().await;
    let apps = db.get_daily_usage()?;

    let total_seconds: i64 = apps.iter().map(|a| a.duration_seconds).sum();

    Ok(DailyStats {
        total_seconds,
        apps,
    })
}

#[tauri::command]
async fn get_weekly_stats(state: State<'_, AppState>) -> CmdResult<WeeklyStats> {
    let db = state.db.lock().await;
    let raw_stats = db.get_weekly_stats()?;

    let days: Vec<commands::DayStats> = raw_stats
        .iter()
        .map(|(timestamp, seconds)| {
            let date = chrono::DateTime::from_timestamp(*timestamp, 0)
                .map(|dt| dt.format("%Y-%m-%d").to_string())
                .unwrap_or_else(|| "1970-01-01".to_string());

            commands::DayStats {
                date,
                timestamp: *timestamp,
                total_seconds: *seconds,
            }
        })
        .collect();

    let total_seconds: i64 = days.iter().map(|d| d.total_seconds).sum();

    Ok(WeeklyStats {
        days,
        total_seconds,
    })
}

#[tauri::command]
async fn set_app_limit(
    state: State<'_, AppState>,
    app_name: String,
    minutes: i32,
    block_when_exceeded: Option<bool>,
) -> CmdResult<()> {
    let db = state.db.lock().await;
    let block = block_when_exceeded.unwrap_or(false);
    db.set_limit_with_block(&app_name, minutes, block)?;
    Ok(())
}

#[tauri::command]
async fn get_app_limits(state: State<'_, AppState>) -> CmdResult<Vec<AppLimit>> {
    let db = state.db.lock().await;
    Ok(db.get_all_limits()?)
}

#[tauri::command]
async fn remove_app_limit(state: State<'_, AppState>, app_name: String) -> CmdResult<()> {
    let db = state.db.lock().await;
    db.remove_limit(&app_name)?;
    Ok(())
}

#[tauri::command]
fn get_theme() -> Theme {
    ThemeLoader::load()
}

#[tauri::command]
fn get_theme_path() -> Option<String> {
    ThemeLoader::get_theme_path().map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
async fn get_all_apps(state: State<'_, AppState>) -> CmdResult<Vec<database::App>> {
    let db = state.db.lock().await;
    Ok(db.get_all_apps()?)
}

#[tauri::command]
async fn record_usage(
    state: State<'_, AppState>,
    app_name: String,
    duration_seconds: i64,
) -> CmdResult<()> {
    let mut db = state.db.lock().await;
    db.record_usage_atomic(&app_name, duration_seconds)?;
    Ok(())
}

#[tauri::command]
async fn get_hourly_usage(state: State<'_, AppState>) -> CmdResult<Vec<HourlyUsage>> {
    let db = state.db.lock().await;
    Ok(db.get_hourly_usage()?)
}

#[tauri::command]
async fn get_category_usage(state: State<'_, AppState>) -> CmdResult<Vec<CategoryUsage>> {
    let db = state.db.lock().await;
    Ok(db.get_category_usage()?)
}

#[tauri::command]
async fn set_app_category(
    state: State<'_, AppState>,
    app_name: String,
    category: String,
) -> CmdResult<()> {
    let db = state.db.lock().await;
    db.set_app_category(&app_name, &category)?;
    Ok(())
}

/// Validates an app name to prevent command injection
/// Only allows alphanumeric characters, spaces, hyphens, underscores, and dots
fn is_valid_app_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 256
        && name
            .chars()
            .all(|c| c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' || c == '.')
}

#[tauri::command]
async fn check_app_blocked(state: State<'_, AppState>, app_name: String) -> CmdResult<bool> {
    if !is_valid_app_name(&app_name) {
        return Err(WellbeingError::InvalidAppName(app_name));
    }
    let db = state.db.lock().await;
    Ok(db.is_app_blocked(&app_name)?)
}

#[tauri::command]
fn block_app(app_name: String) -> CmdResult<()> {
    // Validate app name to prevent command injection
    if !is_valid_app_name(&app_name) {
        return Err(WellbeingError::InvalidAppName(app_name));
    }

    // On Linux, use wmctrl or xdotool to close app windows
    #[cfg(target_os = "linux")]
    {
        // Try to close windows of the app using wmctrl
        let _ = Command::new("wmctrl").args(["-c", &app_name]).output();

        // Also try to kill the process (less aggressive approach - send SIGTERM)
        // Using exact match with -x flag to avoid partial matches
        let _ = Command::new("pkill").args(["-x", &app_name]).output();
    }

    Ok(())
}

#[tauri::command]
async fn get_blocked_apps(state: State<'_, AppState>) -> CmdResult<Vec<String>> {
    let db = state.db.lock().await;
    Ok(db.get_blocked_apps()?)
}

#[tauri::command]
fn get_installed_apps() -> Vec<InstalledApp> {
    app_scanner::get_installed_apps()
}

#[tauri::command]
fn send_test_notification() -> CmdResult<()> {
    // Use notify-send on Linux
    #[cfg(target_os = "linux")]
    {
        let result = Command::new("notify-send")
            .args([
                "--app-name=Digital Wellbeing",
                "--urgency=normal",
                "--icon=dialog-information",
                "Digital Wellbeing",
                "Notifications are working! You will receive alerts when approaching or exceeding app limits.",
            ])
            .output();

        match result {
            Ok(output) => {
                if output.status.success() {
                    return Ok(());
                }
                return Err(WellbeingError::Notification(format!(
                    "notify-send failed: {}",
                    String::from_utf8_lossy(&output.stderr)
                )));
            }
            Err(e) => {
                return Err(WellbeingError::Notification(format!(
                    "Failed to run notify-send: {}. Make sure libnotify is installed.",
                    e
                )));
            }
        }
    }

    #[cfg(not(target_os = "linux"))]
    {
        Ok(())
    }
}

#[tauri::command]
fn enable_autostart() -> CmdResult<String> {
    autostart::install_autostart().map_err(WellbeingError::Autostart)
}

#[tauri::command]
fn disable_autostart() -> CmdResult<String> {
    autostart::uninstall_autostart().map_err(WellbeingError::Autostart)
}

#[tauri::command]
fn get_autostart_status() -> AutostartStatus {
    autostart::get_autostart_status()
}

/// Default data retention period in days
const DEFAULT_RETENTION_DAYS: i64 = 90;

#[tauri::command]
async fn cleanup_old_data(state: State<'_, AppState>, days: Option<i64>) -> CmdResult<usize> {
    let retention_days = days.unwrap_or(DEFAULT_RETENTION_DAYS);
    let db = state.db.lock().await;
    Ok(db.cleanup_old_data(retention_days)?)
}

#[tauri::command]
async fn get_storage_stats(state: State<'_, AppState>) -> CmdResult<(i64, i64, Option<String>)> {
    let db = state.db.lock().await;
    Ok(db.get_storage_stats()?)
}

#[tauri::command]
async fn export_usage_data(
    state: State<'_, AppState>,
    start_date: String,
    end_date: String,
) -> CmdResult<Vec<ExportRecord>> {
    // Parse dates (YYYY-MM-DD format) and convert to timestamps
    let start_timestamp = chrono::NaiveDate::parse_from_str(&start_date, "%Y-%m-%d")
        .map_err(|e| WellbeingError::Export(format!("Invalid start date: {}", e)))?
        .and_hms_opt(0, 0, 0)
        .ok_or_else(|| WellbeingError::Export("Invalid start time".into()))?
        .and_utc()
        .timestamp();

    let end_timestamp = chrono::NaiveDate::parse_from_str(&end_date, "%Y-%m-%d")
        .map_err(|e| WellbeingError::Export(format!("Invalid end date: {}", e)))?
        .and_hms_opt(23, 59, 59)
        .ok_or_else(|| WellbeingError::Export("Invalid end time".into()))?
        .and_utc()
        .timestamp();

    let db = state.db.lock().await;
    Ok(db.export_usage_data(start_timestamp, end_timestamp)?)
}

#[tauri::command]
fn format_export_csv(records: Vec<ExportRecord>) -> String {
    let mut csv =
        String::from("Date,App Name,Category,Duration (seconds),Duration (formatted),Sessions\n");

    for record in records {
        let hours = record.duration_seconds / 3600;
        let minutes = (record.duration_seconds % 3600) / 60;
        let formatted_duration = if hours > 0 {
            format!("{}h {}m", hours, minutes)
        } else {
            format!("{}m", minutes)
        };

        // Escape CSV fields that might contain commas or quotes
        let app_name = escape_csv_field(&record.app_name);
        let category = escape_csv_field(&record.category);

        csv.push_str(&format!(
            "{},{},{},{},{},{}\n",
            record.date,
            app_name,
            category,
            record.duration_seconds,
            formatted_duration,
            record.session_count
        ));
    }

    csv
}

#[tauri::command]
fn format_export_json(records: Vec<ExportRecord>) -> CmdResult<String> {
    serde_json::to_string_pretty(&records)
        .map_err(|e| WellbeingError::Export(format!("JSON serialization error: {}", e)))
}

/// Historical data response containing daily totals and app breakdown
#[derive(serde::Serialize)]
struct HistoricalData {
    daily_totals: Vec<DayStats>,
    app_usage: Vec<AppUsage>,
    category_usage: Vec<CategoryUsage>,
    total_seconds: i64,
}

#[tauri::command]
async fn get_historical_data(
    state: State<'_, AppState>,
    start_date: String,
    end_date: String,
) -> CmdResult<HistoricalData> {
    // Parse dates (YYYY-MM-DD format) and convert to timestamps
    let start_timestamp = chrono::NaiveDate::parse_from_str(&start_date, "%Y-%m-%d")
        .map_err(|e| WellbeingError::Export(format!("Invalid start date: {}", e)))?
        .and_hms_opt(0, 0, 0)
        .ok_or_else(|| WellbeingError::Export("Invalid start time".into()))?
        .and_utc()
        .timestamp();

    let end_timestamp = chrono::NaiveDate::parse_from_str(&end_date, "%Y-%m-%d")
        .map_err(|e| WellbeingError::Export(format!("Invalid end date: {}", e)))?
        .and_hms_opt(23, 59, 59)
        .ok_or_else(|| WellbeingError::Export("Invalid end time".into()))?
        .and_utc()
        .timestamp();

    let db = state.db.lock().await;

    // Get daily totals
    let raw_totals = db.get_daily_totals_in_range(start_timestamp, end_timestamp)?;
    let daily_totals: Vec<DayStats> = raw_totals
        .iter()
        .map(|(date_str, seconds)| {
            let timestamp = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
                .ok()
                .and_then(|d| d.and_hms_opt(12, 0, 0))
                .map(|dt| dt.and_utc().timestamp())
                .unwrap_or(0);

            DayStats {
                date: date_str.clone(),
                timestamp,
                total_seconds: *seconds,
            }
        })
        .collect();

    // Get app usage breakdown
    let app_usage = db.get_app_usage_in_range(start_timestamp, end_timestamp)?;

    // Get category usage breakdown
    let category_usage = db.get_category_usage_in_range(start_timestamp, end_timestamp)?;

    // Calculate total
    let total_seconds: i64 = daily_totals.iter().map(|d| d.total_seconds).sum();

    Ok(HistoricalData {
        daily_totals,
        app_usage,
        category_usage,
        total_seconds,
    })
}

/// Escape a CSV field by wrapping in quotes if it contains special characters
fn escape_csv_field(field: &str) -> String {
    if field.contains(',') || field.contains('"') || field.contains('\n') {
        format!("\"{}\"", field.replace('"', "\"\""))
    } else {
        field.to_string()
    }
}

#[tauri::command]
async fn minimize_to_tray(window: tauri::Window) -> CmdResult<()> {
    window
        .hide()
        .map_err(|e| WellbeingError::Other(e.to_string()))?;
    Ok(())
}

#[tauri::command]
async fn show_window(window: tauri::Window) -> CmdResult<()> {
    window
        .show()
        .map_err(|e| WellbeingError::Other(e.to_string()))?;
    window
        .set_focus()
        .map_err(|e| WellbeingError::Other(e.to_string()))?;
    Ok(())
}

// Break reminder commands
#[tauri::command]
async fn get_break_settings(state: State<'_, AppState>) -> CmdResult<BreakSettings> {
    Ok(state.break_reminder.get_settings().await)
}

#[tauri::command]
async fn set_break_settings(state: State<'_, AppState>, settings: BreakSettings) -> CmdResult<()> {
    state.break_reminder.update_settings(settings).await;
    Ok(())
}

#[tauri::command]
async fn get_break_status(state: State<'_, AppState>) -> CmdResult<BreakStatus> {
    let settings = state.break_reminder.get_settings().await;
    let minutes_worked = state.break_reminder.get_minutes_worked().await;
    let is_on_break = state.break_reminder.is_on_break();

    Ok(BreakStatus {
        enabled: settings.enabled,
        minutes_worked,
        work_minutes: settings.work_minutes,
        is_on_break,
    })
}

#[tauri::command]
async fn start_break(state: State<'_, AppState>) -> CmdResult<()> {
    state.break_reminder.start_break().await;
    Ok(())
}

#[tauri::command]
async fn end_break(state: State<'_, AppState>) -> CmdResult<()> {
    state.break_reminder.end_break().await;
    Ok(())
}

#[tauri::command]
async fn reset_break_timer(state: State<'_, AppState>) -> CmdResult<()> {
    state.break_reminder.reset_timer().await;
    Ok(())
}

// Notification settings commands
#[tauri::command]
async fn get_notification_settings(state: State<'_, AppState>) -> CmdResult<NotificationSettings> {
    Ok(state.notification_manager.get_settings().await)
}

#[tauri::command]
async fn set_notification_settings(
    state: State<'_, AppState>,
    settings: NotificationSettings,
) -> CmdResult<()> {
    state.notification_manager.update_settings(settings).await;
    Ok(())
}

#[tauri::command]
async fn mute_notifications(state: State<'_, AppState>) -> CmdResult<()> {
    state.notification_manager.mute();
    Ok(())
}

#[tauri::command]
async fn unmute_notifications(state: State<'_, AppState>) -> CmdResult<()> {
    state.notification_manager.unmute();
    Ok(())
}

#[tauri::command]
async fn is_notifications_muted(state: State<'_, AppState>) -> CmdResult<bool> {
    Ok(state.notification_manager.is_muted())
}

// Focus mode commands
#[tauri::command]
async fn get_focus_settings(state: State<'_, AppState>) -> CmdResult<FocusSettings> {
    Ok(state.focus_manager.get_settings().await)
}

#[tauri::command]
async fn set_focus_settings(state: State<'_, AppState>, settings: FocusSettings) -> CmdResult<()> {
    state.focus_manager.update_settings(settings).await;
    Ok(())
}

#[tauri::command]
async fn get_focus_session(state: State<'_, AppState>) -> CmdResult<FocusSession> {
    Ok(state.focus_manager.get_session().await)
}

#[tauri::command]
async fn start_focus_session(
    state: State<'_, AppState>,
    duration_minutes: Option<u32>,
    blocked_apps: Option<Vec<String>>,
) -> CmdResult<FocusSession> {
    Ok(state
        .focus_manager
        .start_session(duration_minutes, blocked_apps)
        .await)
}

#[tauri::command]
async fn stop_focus_session(state: State<'_, AppState>) -> CmdResult<FocusSession> {
    Ok(state.focus_manager.stop_session().await)
}

#[tauri::command]
async fn extend_focus_session(
    state: State<'_, AppState>,
    additional_minutes: u32,
) -> CmdResult<Option<FocusSession>> {
    Ok(state.focus_manager.extend_session(additional_minutes).await)
}

#[tauri::command]
async fn is_focus_mode_active(state: State<'_, AppState>) -> CmdResult<bool> {
    Ok(state.focus_manager.is_active())
}

#[tauri::command]
async fn should_block_app_focus(state: State<'_, AppState>, app_name: String) -> CmdResult<bool> {
    Ok(state.focus_manager.should_block_app(&app_name).await)
}

#[tauri::command]
async fn add_focus_blocked_app(state: State<'_, AppState>, app_name: String) -> CmdResult<()> {
    state.focus_manager.add_blocked_app(app_name).await;
    Ok(())
}

#[tauri::command]
async fn remove_focus_blocked_app(state: State<'_, AppState>, app_name: String) -> CmdResult<()> {
    state.focus_manager.remove_blocked_app(&app_name).await;
    Ok(())
}

// Goals commands
#[tauri::command]
async fn get_goals(state: State<'_, AppState>) -> CmdResult<Vec<Goal>> {
    let goals_state = state.goals_state.lock().await;
    Ok(goals_state.goals.clone())
}

#[tauri::command]
async fn add_goal(state: State<'_, AppState>, goal: Goal) -> CmdResult<()> {
    let mut goals_state = state.goals_state.lock().await;
    goals_state.add_goal(goal);
    Ok(())
}

#[tauri::command]
async fn update_goal(state: State<'_, AppState>, goal: Goal) -> CmdResult<()> {
    let mut goals_state = state.goals_state.lock().await;
    goals_state.update_goal(goal);
    Ok(())
}

#[tauri::command]
async fn remove_goal(state: State<'_, AppState>, goal_id: String) -> CmdResult<()> {
    let mut goals_state = state.goals_state.lock().await;
    goals_state.remove_goal(&goal_id);
    Ok(())
}

#[tauri::command]
async fn get_goals_progress(state: State<'_, AppState>) -> CmdResult<Vec<GoalProgress>> {
    let db = state.db.lock().await;
    let goals_state = state.goals_state.lock().await;

    // Get today's usage data
    let apps = db.get_daily_usage()?;
    let categories = db.get_category_usage()?;

    let total_daily_minutes = (apps.iter().map(|a| a.duration_seconds).sum::<i64>() / 60) as i32;

    // Build usage maps
    let app_usage: HashMap<String, i32> = apps
        .iter()
        .map(|a| (a.app_name.clone(), (a.duration_seconds / 60) as i32))
        .collect();

    let category_usage: HashMap<String, i32> = categories
        .iter()
        .map(|c| (c.category.clone(), (c.total_seconds / 60) as i32))
        .collect();

    // Calculate progress for each goal
    let today = chrono::Local::now().date_naive();
    let progress: Vec<GoalProgress> = goals_state
        .get_goals_for_day(today)
        .iter()
        .map(|goal| {
            goals::calculate_goal_progress(goal, total_daily_minutes, &app_usage, &category_usage)
        })
        .collect();

    Ok(progress)
}

#[tauri::command]
async fn get_achievements(state: State<'_, AppState>) -> CmdResult<Vec<Achievement>> {
    let goals_state = state.goals_state.lock().await;
    Ok(goals_state.get_achievements())
}

#[tauri::command]
async fn get_goals_stats(state: State<'_, AppState>) -> CmdResult<GoalsStats> {
    let goals_state = state.goals_state.lock().await;
    Ok(GoalsStats {
        current_streak: goals_state.current_streak,
        longest_streak: goals_state.longest_streak,
        total_goals_met: goals_state.total_goals_met,
        focus_sessions_completed: goals_state.focus_sessions_completed,
    })
}

#[derive(serde::Serialize)]
struct GoalsStats {
    current_streak: i32,
    longest_streak: i32,
    total_goals_met: i32,
    focus_sessions_completed: i32,
}

#[derive(serde::Serialize)]
struct BreakStatus {
    enabled: bool,
    minutes_worked: u32,
    work_minutes: u32,
    is_on_break: bool,
}

/// Run the app in headless background mode (no GUI window)
/// This is used by the autostart service to track usage silently
pub fn run_background() {
    // Initialize tracing subscriber for background mode
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into()),
        )
        .init();

    tracing::info!("Starting Digital Wellbeing in background mode...");

    let db_path = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("wellbeing")
        .join("wellbeing.db");

    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).expect("Failed to create data directory");
    }

    let db = Database::new(db_path).expect("Failed to initialize database");
    let db = Arc::new(Mutex::new(db));

    // Create tokio runtime for async operations
    let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");

    rt.block_on(async {
        let tracker = Arc::new(UsageTracker::new(db));
        tracing::info!("Background tracker started. Press Ctrl+C to stop.");

        // Start tracking - this runs indefinitely
        tracker.start_tracking().await;
    });
}

/// Initialize the tracing subscriber for the application
fn init_tracing() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into()),
        )
        .init();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize tracing for structured logging
    init_tracing();

    let db_path = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("wellbeing")
        .join("wellbeing.db");

    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).expect("Failed to create data directory");
    }

    let db = Database::new(db_path).expect("Failed to initialize database");
    let db = Arc::new(Mutex::new(db));

    // Create break reminder
    let break_reminder = Arc::new(BreakReminder::new());

    // Create notification manager
    let notification_manager = Arc::new(NotificationManager::new());

    // Create focus manager
    let focus_manager = Arc::new(FocusManager::new());

    // Create goals state
    let goals_state = Arc::new(Mutex::new(GoalsState::new()));

    // Clone db for background tracker
    let tracker_db = Arc::clone(&db);
    let break_reminder_clone = Arc::clone(&break_reminder);
    let focus_manager_clone = Arc::clone(&focus_manager);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState { db, break_reminder, notification_manager, focus_manager, goals_state })
        .setup(move |app| {
            // Initialize system tray
            if let Err(e) = tray::create_tray(app.handle()) {
                tracing::error!(error = %e, "Failed to create system tray");
            }

            // Start background usage tracking using Tauri's async runtime
            let tracker = Arc::new(UsageTracker::new(tracker_db.clone()));
            let tracker_clone = Arc::clone(&tracker);

            tauri::async_runtime::spawn(async move {
                tracker_clone.start_tracking().await;
            });

            // Run data cleanup on startup (delete data older than 90 days)
            let cleanup_db = Arc::clone(&tracker_db);
            tauri::async_runtime::spawn(async move {
                let db = cleanup_db.lock().await;
                match db.cleanup_old_data(DEFAULT_RETENTION_DAYS) {
                    Ok(deleted) if deleted > 0 => {
                        tracing::info!(deleted_sessions = deleted, "Cleaned up old usage sessions");
                    }
                    Err(e) => {
                        tracing::error!(error = %e, "Failed to cleanup old data");
                    }
                    _ => {}
                }
            });

            // Start break reminder background task
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
                loop {
                    interval.tick().await;
                    if let Some(notification) = break_reminder_clone.tick().await {
                        notification.send();
                        tracing::info!("Break reminder notification sent");
                    }
                }
            });

            // Start focus mode background task (check schedules and session expiry)
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
                loop {
                    interval.tick().await;
                    if let Some(event) = focus_manager_clone.tick().await {
                        match event {
                            focus_mode::FocusEvent::ScheduleStarted(schedule) => {
                                tracing::info!(schedule = %schedule.name, "Starting scheduled focus session");
                                focus_manager_clone.start_scheduled_session(&schedule).await;
                            }
                            focus_mode::FocusEvent::ScheduleEnded => {
                                tracing::info!("Scheduled focus session ended");
                                focus_manager_clone.stop_session().await;
                            }
                            focus_mode::FocusEvent::SessionExpired => {
                                tracing::info!("Focus session expired");
                                focus_manager_clone.stop_session().await;
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_daily_usage,
            get_weekly_stats,
            set_app_limit,
            get_app_limits,
            remove_app_limit,
            get_theme,
            get_theme_path,
            get_all_apps,
            record_usage,
            get_hourly_usage,
            get_category_usage,
            set_app_category,
            check_app_blocked,
            block_app,
            get_blocked_apps,
            get_installed_apps,
            send_test_notification,
            enable_autostart,
            disable_autostart,
            get_autostart_status,
            cleanup_old_data,
            get_storage_stats,
            export_usage_data,
            format_export_csv,
            format_export_json,
            get_historical_data,
            minimize_to_tray,
            show_window,
            get_break_settings,
            set_break_settings,
            get_break_status,
            start_break,
            end_break,
            reset_break_timer,
            get_notification_settings,
            set_notification_settings,
            mute_notifications,
            unmute_notifications,
            is_notifications_muted,
            get_focus_settings,
            set_focus_settings,
            get_focus_session,
            start_focus_session,
            stop_focus_session,
            extend_focus_session,
            is_focus_mode_active,
            should_block_app_focus,
            add_focus_blocked_app,
            remove_focus_blocked_app,
            get_goals,
            add_goal,
            update_goal,
            remove_goal,
            get_goals_progress,
            get_achievements,
            get_goals_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use database::ExportRecord;

    #[test]
    fn test_valid_app_names() {
        assert!(is_valid_app_name("Firefox"));
        assert!(is_valid_app_name("Visual Studio Code"));
        assert!(is_valid_app_name("my-app"));
        assert!(is_valid_app_name("my_app"));
        assert!(is_valid_app_name("app.name"));
        assert!(is_valid_app_name("App123"));
    }

    #[test]
    fn test_invalid_app_names() {
        // Empty
        assert!(!is_valid_app_name(""));

        // Contains shell metacharacters
        assert!(!is_valid_app_name("app; rm -rf /"));
        assert!(!is_valid_app_name("app && malicious"));
        assert!(!is_valid_app_name("app | cat /etc/passwd"));
        assert!(!is_valid_app_name("$(whoami)"));
        assert!(!is_valid_app_name("`id`"));
        assert!(!is_valid_app_name("app\nmalicious"));

        // Contains special characters
        assert!(!is_valid_app_name("app<>"));
        assert!(!is_valid_app_name("app!@#$%"));
    }

    #[test]
    fn test_app_name_length_limit() {
        // 256 chars is the limit
        let valid_long = "a".repeat(256);
        assert!(is_valid_app_name(&valid_long));

        // 257 chars exceeds limit
        let invalid_long = "a".repeat(257);
        assert!(!is_valid_app_name(&invalid_long));
    }

    #[test]
    fn test_app_name_unicode() {
        // Unicode letters should be valid (alphanumeric includes unicode)
        assert!(is_valid_app_name("アプリ")); // Japanese
        assert!(is_valid_app_name("应用程序")); // Chinese
        assert!(is_valid_app_name("приложение")); // Russian
    }

    #[test]
    fn test_escape_csv_field_simple() {
        // Simple fields without special chars don't need escaping
        assert_eq!(escape_csv_field("Firefox"), "Firefox");
        assert_eq!(escape_csv_field("Development"), "Development");
        assert_eq!(escape_csv_field("123"), "123");
    }

    #[test]
    fn test_escape_csv_field_with_comma() {
        // Fields with commas should be quoted
        assert_eq!(escape_csv_field("Hello, World"), "\"Hello, World\"");
    }

    #[test]
    fn test_escape_csv_field_with_quotes() {
        // Fields with quotes should be escaped (doubled) and quoted
        assert_eq!(escape_csv_field("Say \"Hello\""), "\"Say \"\"Hello\"\"\"");
    }

    #[test]
    fn test_escape_csv_field_with_newline() {
        // Fields with newlines should be quoted
        assert_eq!(escape_csv_field("Line1\nLine2"), "\"Line1\nLine2\"");
    }

    #[test]
    fn test_format_export_csv_structure() {
        let records = vec![
            ExportRecord {
                date: "2026-01-12".to_string(),
                app_name: "Firefox".to_string(),
                category: "Productivity".to_string(),
                duration_seconds: 3661, // 1h 1m 1s
                session_count: 5,
            },
            ExportRecord {
                date: "2026-01-12".to_string(),
                app_name: "Code".to_string(),
                category: "Development".to_string(),
                duration_seconds: 120, // 2m
                session_count: 1,
            },
        ];

        let csv = format_export_csv(records);

        // Check header
        assert!(csv.starts_with(
            "Date,App Name,Category,Duration (seconds),Duration (formatted),Sessions\n"
        ));

        // Check first data row
        assert!(csv.contains("2026-01-12,Firefox,Productivity,3661,1h 1m,5"));

        // Check second data row
        assert!(csv.contains("2026-01-12,Code,Development,120,2m,1"));
    }
}
