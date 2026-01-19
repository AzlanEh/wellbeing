use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Duration of emergency access in seconds (10 minutes)
pub const EMERGENCY_ACCESS_DURATION: i64 = 10 * 60;

/// Manages emergency access grants for blocked apps
pub struct EmergencyAccessManager {
    /// Map of app name to expiry timestamp (Unix timestamp)
    access_grants: Arc<Mutex<HashMap<String, i64>>>,
    /// The date we last reset grants (to reset daily)
    last_reset_date: Arc<Mutex<String>>,
}

impl EmergencyAccessManager {
    pub fn new() -> Self {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        EmergencyAccessManager {
            access_grants: Arc::new(Mutex::new(HashMap::new())),
            last_reset_date: Arc::new(Mutex::new(today)),
        }
    }

    /// Reset grants if it's a new day
    async fn reset_if_new_day(&self) {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let mut last_reset = self.last_reset_date.lock().await;

        if *last_reset != today {
            let mut grants = self.access_grants.lock().await;
            grants.clear();
            *last_reset = today;
            tracing::info!("Reset emergency access grants for new day");
        }
    }

    /// Grant emergency access for an app (10 minutes)
    pub async fn grant_access(&self, app_name: &str) -> i64 {
        self.reset_if_new_day().await;

        let now = chrono::Utc::now().timestamp();
        let expiry = now + EMERGENCY_ACCESS_DURATION;

        let mut grants = self.access_grants.lock().await;
        grants.insert(app_name.to_string(), expiry);

        tracing::info!(
            app = %app_name,
            expiry_seconds = EMERGENCY_ACCESS_DURATION,
            "Granted emergency access"
        );

        expiry
    }

    /// Check if an app has active emergency access
    pub async fn has_active_access(&self, app_name: &str) -> bool {
        self.reset_if_new_day().await;

        let now = chrono::Utc::now().timestamp();
        let grants = self.access_grants.lock().await;

        if let Some(&expiry) = grants.get(app_name) {
            if expiry > now {
                return true;
            }
        }

        false
    }

    /// Get remaining emergency access time in seconds (0 if no active access)
    pub async fn get_remaining_time(&self, app_name: &str) -> i64 {
        self.reset_if_new_day().await;

        let now = chrono::Utc::now().timestamp();
        let grants = self.access_grants.lock().await;

        if let Some(&expiry) = grants.get(app_name) {
            let remaining = expiry - now;
            if remaining > 0 {
                return remaining;
            }
        }

        0
    }

    /// Revoke emergency access for an app
    pub async fn revoke_access(&self, app_name: &str) {
        let mut grants = self.access_grants.lock().await;
        grants.remove(app_name);
        tracing::info!(app = %app_name, "Revoked emergency access");
    }

    /// Clean up expired grants
    pub async fn cleanup_expired(&self) {
        let now = chrono::Utc::now().timestamp();
        let mut grants = self.access_grants.lock().await;
        grants.retain(|app, &mut expiry| {
            if expiry <= now {
                tracing::info!(app = %app, "Emergency access expired");
                false
            } else {
                true
            }
        });
    }
}

impl Default for EmergencyAccessManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_grant_and_check_access() {
        let manager = EmergencyAccessManager::new();

        // Initially no access
        assert!(!manager.has_active_access("Firefox").await);
        assert_eq!(manager.get_remaining_time("Firefox").await, 0);

        // Grant access
        let expiry = manager.grant_access("Firefox").await;
        assert!(expiry > chrono::Utc::now().timestamp());

        // Now should have access
        assert!(manager.has_active_access("Firefox").await);
        assert!(manager.get_remaining_time("Firefox").await > 0);
    }

    #[tokio::test]
    async fn test_revoke_access() {
        let manager = EmergencyAccessManager::new();

        manager.grant_access("Firefox").await;
        assert!(manager.has_active_access("Firefox").await);

        manager.revoke_access("Firefox").await;
        assert!(!manager.has_active_access("Firefox").await);
    }
}
