use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::sync::RwLock;

/// Notification settings for the app
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationSettings {
    pub enabled: bool,
    pub warning_threshold: u32,  // percentage (e.g., 80)
    pub exceeded_threshold: u32, // percentage (e.g., 100)
    pub dnd_enabled: bool,
    pub dnd_start_hour: u32, // 0-23
    pub dnd_end_hour: u32,   // 0-23
}

impl Default for NotificationSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            warning_threshold: 80,
            exceeded_threshold: 100,
            dnd_enabled: false,
            dnd_start_hour: 22, // 10 PM
            dnd_end_hour: 8,    // 8 AM
        }
    }
}

pub struct NotificationManager {
    settings: RwLock<NotificationSettings>,
    muted: AtomicBool,
}

impl NotificationManager {
    pub fn new() -> Self {
        Self {
            settings: RwLock::new(NotificationSettings::default()),
            muted: AtomicBool::new(false),
        }
    }

    pub async fn get_settings(&self) -> NotificationSettings {
        self.settings.read().await.clone()
    }

    pub async fn update_settings(&self, settings: NotificationSettings) {
        *self.settings.write().await = settings;
    }

    /// Check if notifications should be shown based on DND schedule
    pub async fn should_notify(&self) -> bool {
        let settings = self.settings.read().await;

        if !settings.enabled {
            return false;
        }

        if self.muted.load(Ordering::Relaxed) {
            return false;
        }

        if settings.dnd_enabled {
            let current_hour = chrono::Local::now().hour();

            // Handle overnight DND (e.g., 22:00 to 08:00)
            if settings.dnd_start_hour > settings.dnd_end_hour {
                // DND is active if current hour is >= start OR < end
                if current_hour >= settings.dnd_start_hour || current_hour < settings.dnd_end_hour {
                    return false;
                }
            } else {
                // Normal range (e.g., 09:00 to 17:00)
                if current_hour >= settings.dnd_start_hour && current_hour < settings.dnd_end_hour {
                    return false;
                }
            }
        }

        true
    }

    /// Get the warning threshold percentage
    pub async fn warning_threshold(&self) -> u32 {
        self.settings.read().await.warning_threshold
    }

    /// Get the exceeded threshold percentage
    pub async fn exceeded_threshold(&self) -> u32 {
        self.settings.read().await.exceeded_threshold
    }

    /// Temporarily mute notifications
    pub fn mute(&self) {
        self.muted.store(true, Ordering::Relaxed);
    }

    /// Unmute notifications
    pub fn unmute(&self) {
        self.muted.store(false, Ordering::Relaxed);
    }

    /// Check if notifications are currently muted
    pub fn is_muted(&self) -> bool {
        self.muted.load(Ordering::Relaxed)
    }

    /// Send a notification if allowed
    pub async fn send_notification(
        &self,
        title: &str,
        body: &str,
        urgency: &str,
    ) -> Result<(), String> {
        if !self.should_notify().await {
            return Ok(());
        }

        #[cfg(target_os = "linux")]
        {
            let result = std::process::Command::new("notify-send")
                .args([
                    "--app-name=Digital Wellbeing",
                    &format!("--urgency={}", urgency),
                    "--icon=dialog-warning",
                    title,
                    body,
                ])
                .output();

            match result {
                Ok(output) if output.status.success() => Ok(()),
                Ok(output) => Err(format!(
                    "notify-send failed: {}",
                    String::from_utf8_lossy(&output.stderr)
                )),
                Err(e) => Err(format!("Failed to run notify-send: {}", e)),
            }
        }

        #[cfg(not(target_os = "linux"))]
        Ok(())
    }
}

impl Default for NotificationManager {
    fn default() -> Self {
        Self::new()
    }
}

use chrono::Timelike;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_settings() {
        let settings = NotificationSettings::default();
        assert!(settings.enabled);
        assert_eq!(settings.warning_threshold, 80);
        assert_eq!(settings.exceeded_threshold, 100);
        assert!(!settings.dnd_enabled);
    }

    #[tokio::test]
    async fn test_notification_manager() {
        let manager = NotificationManager::new();

        // Default settings should allow notifications
        let settings = manager.get_settings().await;
        assert!(settings.enabled);

        // Muting should work
        manager.mute();
        assert!(manager.is_muted());

        manager.unmute();
        assert!(!manager.is_muted());
    }
}
