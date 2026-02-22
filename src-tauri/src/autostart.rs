use std::fs;
use std::path::PathBuf;
use std::process::Command;

/// Get the path to the installed application binary
fn get_app_binary_path() -> Option<PathBuf> {
    // Check common installation paths
    let possible_paths: Vec<PathBuf> = vec![
        // Installed via package manager or manual install
        PathBuf::from("/usr/bin/wellbeing"),
        PathBuf::from("/usr/local/bin/wellbeing"),
        // Flatpak-style
        PathBuf::from("/app/bin/wellbeing"),
    ];

    for path in possible_paths {
        if path.exists() {
            return Some(path);
        }
    }

    // Fallback to current executable
    std::env::current_exe().ok()
}

/// Get the systemd user service directory
fn get_systemd_user_dir() -> Option<PathBuf> {
    dirs::config_dir().map(|p| p.join("systemd/user"))
}

/// Get the XDG autostart directory
fn get_autostart_dir() -> Option<PathBuf> {
    dirs::config_dir().map(|p| p.join("autostart"))
}

/// Generate systemd service file content
fn generate_systemd_service(binary_path: &str) -> String {
    format!(
        r#"[Unit]
Description=Digital Wellbeing - Screen Time Tracker
Documentation=https://github.com/user/wellbeing
After=graphical-session.target

[Service]
Type=simple
ExecStart={binary_path} --background
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
"#,
        binary_path = binary_path
    )
}

/// Generate XDG autostart desktop entry content
fn generate_autostart_desktop(binary_path: &str) -> String {
    format!(
        r#"[Desktop Entry]
Type=Application
Name=Digital Wellbeing
Comment=Track and manage your screen time
Exec={binary_path} --background
Icon=wellbeing
Terminal=false
Categories=Utility;
StartupNotify=false
X-GNOME-Autostart-enabled=true
X-GNOME-Autostart-Delay=5
"#,
        binary_path = binary_path
    )
}

/// Install the autostart service
pub fn install_autostart() -> Result<String, String> {
    let binary_path = get_app_binary_path().ok_or("Could not find application binary")?;
    let binary_str = binary_path.to_string_lossy().to_string();

    let mut methods_installed = Vec::new();

    // Method 1: Try systemd user service (preferred for modern Linux)
    if let Some(systemd_dir) = get_systemd_user_dir() {
        fs::create_dir_all(&systemd_dir)
            .map_err(|e| format!("Failed to create systemd directory: {}", e))?;

        let service_path = systemd_dir.join("wellbeing.service");
        let service_content = generate_systemd_service(&binary_str);

        fs::write(&service_path, service_content)
            .map_err(|e| format!("Failed to write systemd service: {}", e))?;

        // Enable the service
        let output = Command::new("systemctl")
            .args(["--user", "daemon-reload"])
            .output();

        if output.is_ok() {
            let _ = Command::new("systemctl")
                .args(["--user", "enable", "wellbeing.service"])
                .output();
            let _ = Command::new("systemctl")
                .args(["--user", "start", "wellbeing.service"])
                .output();
            methods_installed.push("systemd user service");
        }
    }

    // Method 2: XDG Autostart (works with most desktop environments)
    if let Some(autostart_dir) = get_autostart_dir() {
        fs::create_dir_all(&autostart_dir)
            .map_err(|e| format!("Failed to create autostart directory: {}", e))?;

        let desktop_path = autostart_dir.join("wellbeing.desktop");
        let desktop_content = generate_autostart_desktop(&binary_str);

        fs::write(&desktop_path, desktop_content)
            .map_err(|e| format!("Failed to write autostart entry: {}", e))?;

        methods_installed.push("XDG autostart");
    }

    if methods_installed.is_empty() {
        Err("Failed to install autostart using any method".to_string())
    } else {
        Ok(format!(
            "Autostart installed via: {}",
            methods_installed.join(", ")
        ))
    }
}

/// Uninstall the autostart service
pub fn uninstall_autostart() -> Result<String, String> {
    let mut methods_removed = Vec::new();

    // Remove systemd service
    if let Some(systemd_dir) = get_systemd_user_dir() {
        let service_path = systemd_dir.join("wellbeing.service");
        if service_path.exists() {
            // Disable and stop the service first
            let _ = Command::new("systemctl")
                .args(["--user", "stop", "wellbeing.service"])
                .output();
            let _ = Command::new("systemctl")
                .args(["--user", "disable", "wellbeing.service"])
                .output();

            fs::remove_file(&service_path)
                .map_err(|e| format!("Failed to remove systemd service: {}", e))?;

            let _ = Command::new("systemctl")
                .args(["--user", "daemon-reload"])
                .output();

            methods_removed.push("systemd user service");
        }
    }

    // Remove XDG autostart entry
    if let Some(autostart_dir) = get_autostart_dir() {
        let desktop_path = autostart_dir.join("wellbeing.desktop");
        if desktop_path.exists() {
            fs::remove_file(&desktop_path)
                .map_err(|e| format!("Failed to remove autostart entry: {}", e))?;
            methods_removed.push("XDG autostart");
        }
    }

    if methods_removed.is_empty() {
        Ok("No autostart configuration found to remove".to_string())
    } else {
        Ok(format!("Autostart removed: {}", methods_removed.join(", ")))
    }
}

/// Check if autostart is enabled
#[allow(dead_code)]
pub fn is_autostart_enabled() -> bool {
    // Check systemd service
    if let Some(systemd_dir) = get_systemd_user_dir() {
        let service_path = systemd_dir.join("wellbeing.service");
        if service_path.exists() {
            // Check if it's enabled
            let output = Command::new("systemctl")
                .args(["--user", "is-enabled", "wellbeing.service"])
                .output();

            if let Ok(out) = output {
                if String::from_utf8_lossy(&out.stdout).trim() == "enabled" {
                    return true;
                }
            }
        }
    }

    // Check XDG autostart
    if let Some(autostart_dir) = get_autostart_dir() {
        let desktop_path = autostart_dir.join("wellbeing.desktop");
        if desktop_path.exists() {
            return true;
        }
    }

    false
}

/// Get autostart status with details
pub fn get_autostart_status() -> AutostartStatus {
    let mut status = AutostartStatus {
        enabled: false,
        systemd_installed: false,
        systemd_running: false,
        xdg_installed: false,
    };

    // Check systemd service
    if let Some(systemd_dir) = get_systemd_user_dir() {
        let service_path = systemd_dir.join("wellbeing.service");
        if service_path.exists() {
            status.systemd_installed = true;

            let output = Command::new("systemctl")
                .args(["--user", "is-enabled", "wellbeing.service"])
                .output();

            if let Ok(out) = output {
                if String::from_utf8_lossy(&out.stdout).trim() == "enabled" {
                    status.enabled = true;
                }
            }

            let output = Command::new("systemctl")
                .args(["--user", "is-active", "wellbeing.service"])
                .output();

            if let Ok(out) = output {
                if String::from_utf8_lossy(&out.stdout).trim() == "active" {
                    status.systemd_running = true;
                }
            }
        }
    }

    // Check XDG autostart
    if let Some(autostart_dir) = get_autostart_dir() {
        let desktop_path = autostart_dir.join("wellbeing.desktop");
        if desktop_path.exists() {
            status.xdg_installed = true;
            status.enabled = true;
        }
    }

    status
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AutostartStatus {
    pub enabled: bool,
    pub systemd_installed: bool,
    pub systemd_running: bool,
    pub xdg_installed: bool,
}
