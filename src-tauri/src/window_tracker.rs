use std::process::Command;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct HyprlandWindow {
    class: Option<String>,
    title: Option<String>,
}

/// Get the name of the currently active window
pub fn get_active_window_name() -> Result<Option<String>, String> {
    // Try Hyprland first (Wayland)
    if let Some(name) = get_hyprland_active_window() {
        return Ok(Some(name));
    }

    // Fall back to X11 methods
    #[cfg(target_os = "linux")]
    {
        // Try xprop (X11)
        if let Some(name) = get_x11_active_window() {
            return Ok(Some(name));
        }
    }

    Ok(None)
}

/// Get active window using Hyprland IPC
fn get_hyprland_active_window() -> Option<String> {
    let output = Command::new("hyprctl")
        .args(["activewindow", "-j"])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    let window: HyprlandWindow = serde_json::from_str(&json_str).ok()?;
    
    // Prefer class (app name), fall back to title
    window.class.or(window.title)
}

/// Get active window using X11 xprop
#[cfg(target_os = "linux")]
fn get_x11_active_window() -> Option<String> {
    // Get the active window ID
    let window_id_output = Command::new("xprop")
        .args(["-root", "_NET_ACTIVE_WINDOW"])
        .output()
        .ok()?;

    if !window_id_output.status.success() {
        return None;
    }

    let output_str = String::from_utf8_lossy(&window_id_output.stdout);
    let window_id = output_str.split("# ").nth(1)?.trim().to_string();

    if window_id == "0x0" || window_id.is_empty() {
        return None;
    }

    // Get window name
    let name_output = Command::new("xprop")
        .args(["-id", &window_id, "WM_NAME"])
        .output()
        .ok()?;

    if !name_output.status.success() {
        return None;
    }

    let output_str = String::from_utf8_lossy(&name_output.stdout);
    let name_part = output_str.split(" = ").nth(1)?;
    let name = name_part.trim().trim_matches('"').to_string();

    if name.is_empty() || name == "WM_NAME" {
        None
    } else {
        Some(name)
    }
}

/// Extract application name from window class or title
pub fn extract_app_name(window_name: &str) -> Option<String> {
    if window_name.is_empty() {
        return None;
    }

    // Normalize the name
    let name_lower = window_name.to_lowercase();

    // Common app class names (Hyprland returns class names directly)
    let app_name = if name_lower == "firefox" || name_lower.contains("firefox") {
        "Firefox".to_string()
    } else if name_lower == "google-chrome" || name_lower.contains("chrome") {
        "Chrome".to_string()
    } else if name_lower == "chromium" || name_lower.contains("chromium") {
        "Chromium".to_string()
    } else if name_lower == "code" || name_lower.contains("visual studio code") || window_name.contains("- Code") {
        "Visual Studio Code".to_string()
    } else if name_lower == "vscodium" {
        "VSCodium".to_string()
    } else if name_lower == "zed" {
        "Zed".to_string()
    } else if name_lower == "cursor" {
        "Cursor".to_string()
    } else if name_lower.contains("alacritty") {
        "Alacritty".to_string()
    } else if name_lower.contains("kitty") {
        "kitty".to_string()
    } else if name_lower.contains("ghostty") {
        "Ghostty".to_string()
    } else if name_lower.contains("foot") {
        "Foot".to_string()
    } else if name_lower.contains("wezterm") {
        "WezTerm".to_string()
    } else if name_lower.contains("terminal") || name_lower.contains("konsole") || name_lower.contains("gnome-terminal") {
        "Terminal".to_string()
    } else if name_lower == "discord" || name_lower.contains("discord") {
        "Discord".to_string()
    } else if name_lower == "slack" {
        "Slack".to_string()
    } else if name_lower == "spotify" {
        "Spotify".to_string()
    } else if name_lower.contains("telegram") {
        "Telegram".to_string()
    } else if name_lower == "obsidian" {
        "Obsidian".to_string()
    } else if name_lower.contains("vlc") {
        "VLC".to_string()
    } else if name_lower.contains("libreoffice") {
        "LibreOffice".to_string()
    } else if name_lower == "gimp" {
        "GIMP".to_string()
    } else if name_lower == "inkscape" {
        "Inkscape".to_string()
    } else if name_lower == "nautilus" || name_lower == "org.gnome.nautilus" {
        "Files".to_string()
    } else if name_lower == "thunar" {
        "Thunar".to_string()
    } else if name_lower == "dolphin" {
        "Dolphin".to_string()
    } else if name_lower == "wellbeing" || window_name.contains("Digital Wellbeing") {
        "Digital Wellbeing".to_string()
    } else if name_lower.contains("opencode") {
        "OpenCode".to_string()
    } else if name_lower == "brave-browser" || name_lower.contains("brave") {
        "Brave".to_string()
    } else if name_lower == "zen-alpha" || name_lower.contains("zen") {
        "Zen Browser".to_string()
    } else if name_lower.contains("thunderbird") {
        "Thunderbird".to_string()
    } else if name_lower == "steam" {
        "Steam".to_string()
    } else if name_lower.contains("blender") {
        "Blender".to_string()
    } else {
        // Use the class name directly, capitalize first letter
        let mut chars = window_name.chars();
        match chars.next() {
            None => return None,
            Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
        }
    };

    if app_name.len() < 2 {
        None
    } else {
        Some(app_name)
    }
}
