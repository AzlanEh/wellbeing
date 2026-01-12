use serde::{Deserialize, Serialize};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::Mutex;

/// Break reminder settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BreakSettings {
    /// Whether break reminders are enabled
    pub enabled: bool,
    /// Work interval in minutes before a break reminder
    pub work_minutes: u32,
    /// Break duration in minutes
    pub break_minutes: u32,
    /// Whether to show a notification
    pub show_notification: bool,
    /// Whether to play a sound (uses system notification sound)
    pub play_sound: bool,
}

impl Default for BreakSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            work_minutes: 25, // Pomodoro default
            break_minutes: 5,
            show_notification: true,
            play_sound: true,
        }
    }
}

/// Break reminder state
pub struct BreakReminder {
    settings: Arc<Mutex<BreakSettings>>,
    is_on_break: AtomicBool,
    minutes_worked: Arc<Mutex<u32>>,
}

impl BreakReminder {
    pub fn new() -> Self {
        Self {
            settings: Arc::new(Mutex::new(BreakSettings::default())),
            is_on_break: AtomicBool::new(false),
            minutes_worked: Arc::new(Mutex::new(0)),
        }
    }

    pub async fn get_settings(&self) -> BreakSettings {
        self.settings.lock().await.clone()
    }

    pub async fn update_settings(&self, settings: BreakSettings) {
        *self.settings.lock().await = settings;
    }

    pub fn is_on_break(&self) -> bool {
        self.is_on_break.load(Ordering::SeqCst)
    }

    pub async fn get_minutes_worked(&self) -> u32 {
        *self.minutes_worked.lock().await
    }

    pub async fn reset_timer(&self) {
        *self.minutes_worked.lock().await = 0;
        self.is_on_break.store(false, Ordering::SeqCst);
    }

    pub async fn start_break(&self) {
        self.is_on_break.store(true, Ordering::SeqCst);
        *self.minutes_worked.lock().await = 0;
    }

    pub async fn end_break(&self) {
        self.is_on_break.store(false, Ordering::SeqCst);
    }

    /// Called every minute to track work time
    /// Returns true if a break notification should be sent
    pub async fn tick(&self) -> Option<BreakNotification> {
        let settings = self.settings.lock().await;

        if !settings.enabled {
            return None;
        }

        if self.is_on_break.load(Ordering::SeqCst) {
            // Currently on break, don't increment work time
            return None;
        }

        let mut minutes = self.minutes_worked.lock().await;
        *minutes += 1;

        if *minutes >= settings.work_minutes {
            // Time for a break!
            *minutes = 0;
            return Some(BreakNotification {
                title: "Time for a break!".to_string(),
                message: format!(
                    "You've been working for {} minutes. Take a {} minute break.",
                    settings.work_minutes, settings.break_minutes
                ),
                show_notification: settings.show_notification,
                play_sound: settings.play_sound,
            });
        }

        None
    }
}

#[derive(Debug, Clone)]
pub struct BreakNotification {
    pub title: String,
    pub message: String,
    pub show_notification: bool,
    pub play_sound: bool,
}

impl BreakNotification {
    /// Send the notification using system notify-send
    pub fn send(&self) {
        if !self.show_notification {
            return;
        }

        #[cfg(target_os = "linux")]
        {
            let args = vec![
                "--app-name=Digital Wellbeing",
                "--urgency=normal",
                "--icon=dialog-information",
            ];

            let title = self.title.clone();
            let message = self.message.clone();

            let _ = Command::new("notify-send")
                .args(&args)
                .arg(&title)
                .arg(&message)
                .output();
        }
    }
}
