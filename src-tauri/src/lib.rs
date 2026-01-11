mod database;
mod commands;
mod theme;
mod window_tracker;
mod tracker;
mod app_scanner;
mod autostart;

use database::{AppLimit, Database, HourlyUsage, CategoryUsage};
use commands::{DailyStats, WeeklyStats};
use theme::{Theme, ThemeLoader};
use tracker::UsageTracker;
use app_scanner::InstalledApp;
use autostart::AutostartStatus;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::State;
use std::process::Command;

pub struct AppState {
    pub db: Arc<Mutex<Database>>,
}

#[tauri::command]
async fn get_daily_usage(state: State<'_, AppState>) -> Result<DailyStats, String> {
    let db = state.db.lock().await;
    let apps = db.get_daily_usage()
        .map_err(|e| format!("Failed to get daily usage: {}", e))?;

    let total_seconds: i64 = apps.iter().map(|a| a.duration_seconds).sum();

    Ok(DailyStats {
        total_seconds,
        apps,
    })
}

#[tauri::command]
async fn get_weekly_stats(state: State<'_, AppState>) -> Result<WeeklyStats, String> {
    let db = state.db.lock().await;
    let raw_stats = db.get_weekly_stats()
        .map_err(|e| format!("Failed to get weekly stats: {}", e))?;

    let days: Vec<commands::DayStats> = raw_stats.iter().map(|(timestamp, seconds)| {
        let date = chrono::DateTime::from_timestamp(*timestamp, 0)
            .map(|dt| dt.format("%Y-%m-%d").to_string())
            .unwrap_or_else(|| "1970-01-01".to_string());

        commands::DayStats {
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

#[tauri::command]
async fn set_app_limit(
    state: State<'_, AppState>, 
    app_name: String, 
    minutes: i32,
    block_when_exceeded: Option<bool>
) -> Result<(), String> {
    let db = state.db.lock().await;
    let block = block_when_exceeded.unwrap_or(false);
    db.set_limit_with_block(&app_name, minutes, block)
        .map_err(|e| format!("Failed to set limit: {}", e))
}

#[tauri::command]
async fn get_app_limits(state: State<'_, AppState>) -> Result<Vec<AppLimit>, String> {
    let db = state.db.lock().await;
    db.get_all_limits()
        .map_err(|e| format!("Failed to get limits: {}", e))
}

#[tauri::command]
async fn remove_app_limit(state: State<'_, AppState>, app_name: String) -> Result<(), String> {
    let db = state.db.lock().await;
    db.remove_limit(&app_name)
        .map_err(|e| format!("Failed to remove limit: {}", e))
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
async fn get_all_apps(state: State<'_, AppState>) -> Result<Vec<database::App>, String> {
    let db = state.db.lock().await;
    db.get_all_apps()
        .map_err(|e| format!("Failed to get apps: {}", e))
}

#[tauri::command]
async fn record_usage(state: State<'_, AppState>, app_name: String, duration_seconds: i64) -> Result<(), String> {
    let mut db = state.db.lock().await;
    db.record_usage_atomic(&app_name, duration_seconds)
        .map_err(|e| format!("Failed to record usage: {}", e))
}

#[tauri::command]
async fn get_hourly_usage(state: State<'_, AppState>) -> Result<Vec<HourlyUsage>, String> {
    let db = state.db.lock().await;
    db.get_hourly_usage()
        .map_err(|e| format!("Failed to get hourly usage: {}", e))
}

#[tauri::command]
async fn get_category_usage(state: State<'_, AppState>) -> Result<Vec<CategoryUsage>, String> {
    let db = state.db.lock().await;
    db.get_category_usage()
        .map_err(|e| format!("Failed to get category usage: {}", e))
}

#[tauri::command]
async fn set_app_category(state: State<'_, AppState>, app_name: String, category: String) -> Result<(), String> {
    let db = state.db.lock().await;
    db.set_app_category(&app_name, &category)
        .map_err(|e| format!("Failed to set category: {}", e))
}

/// Validates an app name to prevent command injection
/// Only allows alphanumeric characters, spaces, hyphens, underscores, and dots
fn is_valid_app_name(name: &str) -> bool {
    !name.is_empty() 
        && name.len() <= 256 
        && name.chars().all(|c| c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' || c == '.')
}

#[tauri::command]
async fn check_app_blocked(state: State<'_, AppState>, app_name: String) -> Result<bool, String> {
    if !is_valid_app_name(&app_name) {
        return Err("Invalid app name".to_string());
    }
    let db = state.db.lock().await;
    db.is_app_blocked(&app_name)
        .map_err(|e| format!("Failed to check if app blocked: {}", e))
}

#[tauri::command]
fn block_app(app_name: String) -> Result<(), String> {
    // Validate app name to prevent command injection
    if !is_valid_app_name(&app_name) {
        return Err("Invalid app name: contains disallowed characters".to_string());
    }

    // On Linux, use wmctrl or xdotool to close app windows
    #[cfg(target_os = "linux")]
    {
        // Try to close windows of the app using wmctrl
        let _ = Command::new("wmctrl")
            .args(["-c", &app_name])
            .output();
        
        // Also try to kill the process (less aggressive approach - send SIGTERM)
        // Using exact match with -x flag to avoid partial matches
        let _ = Command::new("pkill")
            .args(["-x", &app_name])
            .output();
    }
    
    Ok(())
}

#[tauri::command]
async fn get_blocked_apps(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let db = state.db.lock().await;
    db.get_blocked_apps()
        .map_err(|e| format!("Failed to get blocked apps: {}", e))
}

#[tauri::command]
fn get_installed_apps() -> Vec<InstalledApp> {
    app_scanner::get_installed_apps()
}

#[tauri::command]
fn send_test_notification() -> Result<(), String> {
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
                return Err(format!("notify-send failed: {:?}", String::from_utf8_lossy(&output.stderr)));
            }
            Err(e) => {
                return Err(format!("Failed to run notify-send: {}. Make sure libnotify is installed.", e));
            }
        }
    }
    
    #[cfg(not(target_os = "linux"))]
    {
        Ok(())
    }
}

#[tauri::command]
fn enable_autostart() -> Result<String, String> {
    autostart::install_autostart()
}

#[tauri::command]
fn disable_autostart() -> Result<String, String> {
    autostart::uninstall_autostart()
}

#[tauri::command]
fn get_autostart_status() -> AutostartStatus {
    autostart::get_autostart_status()
}

/// Default data retention period in days
const DEFAULT_RETENTION_DAYS: i64 = 90;

#[tauri::command]
async fn cleanup_old_data(state: State<'_, AppState>, days: Option<i64>) -> Result<usize, String> {
    let retention_days = days.unwrap_or(DEFAULT_RETENTION_DAYS);
    let db = state.db.lock().await;
    db.cleanup_old_data(retention_days)
        .map_err(|e| format!("Failed to cleanup old data: {}", e))
}

#[tauri::command]
async fn get_storage_stats(state: State<'_, AppState>) -> Result<(i64, i64, Option<String>), String> {
    let db = state.db.lock().await;
    db.get_storage_stats()
        .map_err(|e| format!("Failed to get storage stats: {}", e))
}

/// Run the app in headless background mode (no GUI window)
/// This is used by the autostart service to track usage silently
pub fn run_background() {
    println!("Starting Digital Wellbeing in background mode...");
    
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
        println!("Background tracker started. Press Ctrl+C to stop.");
        
        // Start tracking - this runs indefinitely
        tracker.start_tracking().await;
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_path = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("wellbeing")
        .join("wellbeing.db");

    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).expect("Failed to create data directory");
    }

    let db = Database::new(db_path).expect("Failed to initialize database");
    let db = Arc::new(Mutex::new(db));

    // Clone db for background tracker
    let tracker_db = Arc::clone(&db);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .manage(AppState { db })
        .setup(move |_app| {
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
                        println!("Cleaned up {} old usage sessions", deleted);
                    }
                    Err(e) => {
                        eprintln!("Failed to cleanup old data: {}", e);
                    }
                    _ => {}
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
            get_storage_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
