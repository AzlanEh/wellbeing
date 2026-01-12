use serde::Serialize;
use thiserror::Error;

/// Main error type for the Wellbeing application
#[derive(Error, Debug)]
pub enum WellbeingError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Invalid app name: {0}")]
    InvalidAppName(String),

    #[error("App not found: {0}")]
    AppNotFound(String),

    #[error("Limit not found for app: {0}")]
    LimitNotFound(String),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Window tracker error: {0}")]
    WindowTracker(String),

    #[error("Notification error: {0}")]
    Notification(String),

    #[error("Autostart error: {0}")]
    Autostart(String),

    #[error("Export error: {0}")]
    Export(String),

    #[error("{0}")]
    Other(String),
}

/// Result type alias for Wellbeing operations
pub type Result<T> = std::result::Result<T, WellbeingError>;

// Implement Serialize for Tauri command compatibility
// Tauri requires error types to be serializable
impl Serialize for WellbeingError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        // Serialize as a string representation of the error
        serializer.serialize_str(&self.to_string())
    }
}

// Allow converting String errors into WellbeingError
impl From<String> for WellbeingError {
    fn from(s: String) -> Self {
        WellbeingError::Other(s)
    }
}

impl From<&str> for WellbeingError {
    fn from(s: &str) -> Self {
        WellbeingError::Other(s.to_string())
    }
}
