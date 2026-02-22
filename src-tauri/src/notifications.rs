use std::process::Command;

/// Send a desktop notification using platform-native tools.
///
/// This provides a cross-platform notification fallback that works
/// without requiring a Tauri AppHandle (e.g., in background mode).
///
/// - Linux: uses `notify-send` (libnotify)
/// - Windows: uses PowerShell toast notifications
/// - macOS: uses `osascript` display notification
pub fn send_notification(title: &str, body: &str) -> bool {
    send_notification_with_urgency(title, body, "normal")
}

/// Send a notification with a specific urgency level.
/// Urgency: "low", "normal", or "critical"
pub fn send_notification_with_urgency(title: &str, body: &str, urgency: &str) -> bool {
    #[cfg(target_os = "linux")]
    {
        let result = Command::new("notify-send")
            .args([
                "--app-name=Digital Wellbeing",
                &format!("--urgency={}", urgency),
                "--icon=dialog-information",
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
                tracing::debug!(error = %e, "notify-send not available");
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
        // Use PowerShell BurntToast or simple toast notification
        let script = format!(
            r#"
Add-Type -AssemblyName System.Windows.Forms
$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = [System.Drawing.SystemIcons]::Information
$notify.Visible = $true
$notify.ShowBalloonTip(5000, '{}', '{}', [System.Windows.Forms.ToolTipIcon]::Info)
Start-Sleep -Seconds 1
$notify.Dispose()
"#,
            title.replace('\'', "''"),
            body.replace('\'', "''")
        );

        let result = Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .output();

        if let Ok(output) = result {
            if output.status.success() {
                return true;
            }
        }
    }

    false
}
