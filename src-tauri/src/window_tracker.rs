use active_win_pos_rs::get_active_window;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU8, Ordering};

/// App name mapping configuration
/// Maps lowercase window class/name patterns to display names
struct AppMapping {
    /// Exact match for the lowercase class name
    exact: Option<&'static str>,
    /// Pattern to search for in the lowercase name (contains)
    contains: Option<&'static str>,
    /// The display name to use
    display_name: &'static str,
}

/// Static mapping of window class patterns to app display names
/// This replaces the long if-else chain with a data-driven approach
static APP_MAPPINGS: Lazy<Vec<AppMapping>> = Lazy::new(|| {
    vec![
        // Browsers
        AppMapping {
            exact: Some("firefox"),
            contains: Some("firefox"),
            display_name: "Firefox",
        },
        AppMapping {
            exact: Some("google-chrome"),
            contains: Some("chrome"),
            display_name: "Chrome",
        },
        AppMapping {
            exact: Some("chromium"),
            contains: Some("chromium"),
            display_name: "Chromium",
        },
        AppMapping {
            exact: Some("brave-browser"),
            contains: Some("brave"),
            display_name: "Brave",
        },
        AppMapping {
            exact: Some("zen-alpha"),
            contains: Some("zen"),
            display_name: "Zen Browser",
        },
        AppMapping {
            exact: Some("msedge"),
            contains: Some("edge"),
            display_name: "Microsoft Edge",
        },
        // Code Editors/IDEs
        AppMapping {
            exact: Some("code"),
            contains: Some("visual studio code"),
            display_name: "Visual Studio Code",
        },
        AppMapping {
            exact: Some("vscodium"),
            contains: None,
            display_name: "VSCodium",
        },
        AppMapping {
            exact: Some("zed"),
            contains: None,
            display_name: "Zed",
        },
        AppMapping {
            exact: Some("cursor"),
            contains: None,
            display_name: "Cursor",
        },
        AppMapping {
            exact: None,
            contains: Some("notepad++"),
            display_name: "Notepad++",
        },
        AppMapping {
            exact: None,
            contains: Some("sublime_text"),
            display_name: "Sublime Text",
        },
        // Terminals
        AppMapping {
            exact: None,
            contains: Some("alacritty"),
            display_name: "Alacritty",
        },
        AppMapping {
            exact: None,
            contains: Some("kitty"),
            display_name: "kitty",
        },
        AppMapping {
            exact: None,
            contains: Some("ghostty"),
            display_name: "Ghostty",
        },
        AppMapping {
            exact: None,
            contains: Some("foot"),
            display_name: "Foot",
        },
        AppMapping {
            exact: None,
            contains: Some("wezterm"),
            display_name: "WezTerm",
        },
        AppMapping {
            exact: None,
            contains: Some("terminal"),
            display_name: "Terminal",
        },
        AppMapping {
            exact: None,
            contains: Some("konsole"),
            display_name: "Terminal",
        },
        AppMapping {
            exact: None,
            contains: Some("gnome-terminal"),
            display_name: "Terminal",
        },
        AppMapping {
            exact: None,
            contains: Some("windowsterminal"),
            display_name: "Windows Terminal",
        },
        AppMapping {
            exact: Some("cmd"),
            contains: None,
            display_name: "Command Prompt",
        },
        AppMapping {
            exact: Some("powershell"),
            contains: None,
            display_name: "PowerShell",
        },
        // Communication
        AppMapping {
            exact: Some("discord"),
            contains: Some("discord"),
            display_name: "Discord",
        },
        AppMapping {
            exact: Some("slack"),
            contains: None,
            display_name: "Slack",
        },
        AppMapping {
            exact: None,
            contains: Some("telegram"),
            display_name: "Telegram",
        },
        AppMapping {
            exact: None,
            contains: Some("thunderbird"),
            display_name: "Thunderbird",
        },
        AppMapping {
            exact: None,
            contains: Some("teams"),
            display_name: "Microsoft Teams",
        },
        AppMapping {
            exact: None,
            contains: Some("outlook"),
            display_name: "Outlook",
        },
        // Media
        AppMapping {
            exact: Some("spotify"),
            contains: None,
            display_name: "Spotify",
        },
        AppMapping {
            exact: None,
            contains: Some("vlc"),
            display_name: "VLC",
        },
        // Productivity
        AppMapping {
            exact: Some("obsidian"),
            contains: None,
            display_name: "Obsidian",
        },
        AppMapping {
            exact: None,
            contains: Some("libreoffice"),
            display_name: "LibreOffice",
        },
        AppMapping {
            exact: None,
            contains: Some("notion"),
            display_name: "Notion",
        },
        // Windows-specific apps
        AppMapping {
            exact: Some("explorer"),
            contains: None,
            display_name: "File Explorer",
        },
        AppMapping {
            exact: None,
            contains: Some("winword"),
            display_name: "Microsoft Word",
        },
        AppMapping {
            exact: None,
            contains: Some("excel"),
            display_name: "Microsoft Excel",
        },
        AppMapping {
            exact: None,
            contains: Some("powerpnt"),
            display_name: "Microsoft PowerPoint",
        },
        // Graphics
        AppMapping {
            exact: Some("gimp"),
            contains: None,
            display_name: "GIMP",
        },
        AppMapping {
            exact: Some("inkscape"),
            contains: None,
            display_name: "Inkscape",
        },
        AppMapping {
            exact: None,
            contains: Some("blender"),
            display_name: "Blender",
        },
        AppMapping {
            exact: None,
            contains: Some("photoshop"),
            display_name: "Photoshop",
        },
        // File Managers
        AppMapping {
            exact: Some("nautilus"),
            contains: None,
            display_name: "Files",
        },
        AppMapping {
            exact: Some("org.gnome.nautilus"),
            contains: None,
            display_name: "Files",
        },
        AppMapping {
            exact: Some("thunar"),
            contains: None,
            display_name: "Thunar",
        },
        AppMapping {
            exact: Some("dolphin"),
            contains: None,
            display_name: "Dolphin",
        },
        // Gaming
        AppMapping {
            exact: Some("steam"),
            contains: None,
            display_name: "Steam",
        },
        // Our app
        AppMapping {
            exact: Some("wellbeing"),
            contains: None,
            display_name: "Digital Wellbeing",
        },
        // Development Tools
        AppMapping {
            exact: None,
            contains: Some("opencode"),
            display_name: "OpenCode",
        },
    ]
});

/// Exact match lookup for common apps (faster path)
static EXACT_MATCH_MAP: Lazy<HashMap<&'static str, &'static str>> = Lazy::new(|| {
    let mut map = HashMap::new();
    for mapping in APP_MAPPINGS.iter() {
        if let Some(exact) = mapping.exact {
            map.insert(exact, mapping.display_name);
        }
    }
    map
});

/// Detection backend: 0 = unknown, 1 = wayland-hyprland, 2 = wayland-sway, 3 = x11
static DETECTION_BACKEND: AtomicU8 = AtomicU8::new(0);

/// Get the name of the currently active window (cross-platform)
///
/// On Linux, detects the session type and uses:
/// - Hyprland: `hyprctl activewindow -j`
/// - Sway: `swaymsg -t get_tree`
/// - X11: `active-win-pos-rs` (xcb)
///
/// On Windows/macOS, uses `active-win-pos-rs` directly.
pub fn get_active_window_name() -> Result<Option<String>, String> {
    #[cfg(target_os = "linux")]
    {
        let backend = DETECTION_BACKEND.load(Ordering::Relaxed);
        match backend {
            0 => {
                // First call: detect which backend to use
                let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok()
                    || std::env::var("XDG_SESSION_TYPE").unwrap_or_default() == "wayland";

                if is_wayland {
                    let desktop = std::env::var("XDG_CURRENT_DESKTOP")
                        .unwrap_or_default()
                        .to_lowercase();
                    if desktop.contains("hyprland") || which_exists("hyprctl") {
                        DETECTION_BACKEND.store(1, Ordering::Relaxed);
                        tracing::info!("Window detection: using Hyprland (hyprctl)");
                        return get_active_window_hyprland();
                    } else if desktop.contains("sway") || which_exists("swaymsg") {
                        DETECTION_BACKEND.store(2, Ordering::Relaxed);
                        tracing::info!("Window detection: using Sway (swaymsg)");
                        return get_active_window_sway();
                    }
                }
                // Fall through to X11
                DETECTION_BACKEND.store(3, Ordering::Relaxed);
                tracing::info!("Window detection: using X11 (active-win-pos-rs)");
                get_active_window_x11()
            }
            1 => get_active_window_hyprland(),
            2 => get_active_window_sway(),
            _ => get_active_window_x11(),
        }
    }

    #[cfg(not(target_os = "linux"))]
    {
        get_active_window_x11()
    }
}

/// Check if a command exists on PATH
#[cfg(target_os = "linux")]
fn which_exists(cmd: &str) -> bool {
    std::process::Command::new("which")
        .arg(cmd)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Hyprland: get active window via `hyprctl activewindow -j`
#[cfg(target_os = "linux")]
fn get_active_window_hyprland() -> Result<Option<String>, String> {
    let output = std::process::Command::new("hyprctl")
        .args(["activewindow", "-j"])
        .output()
        .map_err(|e| format!("Failed to run hyprctl: {}", e))?;

    if !output.status.success() {
        return Ok(None);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse hyprctl JSON: {}", e))?;

    // Prefer "class" (e.g. "com.mitchellh.ghostty"), fall back to "title"
    let class = json.get("class").and_then(|v| v.as_str()).unwrap_or("");
    let title = json.get("title").and_then(|v| v.as_str()).unwrap_or("");

    if !class.is_empty() {
        Ok(Some(class.to_string()))
    } else if !title.is_empty() {
        Ok(Some(title.to_string()))
    } else {
        Ok(None)
    }
}

/// Sway: get active window via `swaymsg -t get_tree`
#[cfg(target_os = "linux")]
fn get_active_window_sway() -> Result<Option<String>, String> {
    let output = std::process::Command::new("swaymsg")
        .args(["-t", "get_tree"])
        .output()
        .map_err(|e| format!("Failed to run swaymsg: {}", e))?;

    if !output.status.success() {
        return Ok(None);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let tree: serde_json::Value =
        serde_json::from_str(&stdout).map_err(|e| format!("Failed to parse sway tree: {}", e))?;

    // Recursively find the focused window
    if let Some(name) = find_sway_focused(&tree) {
        Ok(Some(name))
    } else {
        Ok(None)
    }
}

/// Recursively find the focused node in sway's tree
#[cfg(target_os = "linux")]
fn find_sway_focused(node: &serde_json::Value) -> Option<String> {
    if node
        .get("focused")
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
    {
        // Prefer app_id (Wayland native), fall back to window_properties.class (XWayland)
        if let Some(app_id) = node.get("app_id").and_then(|v| v.as_str()) {
            if !app_id.is_empty() {
                return Some(app_id.to_string());
            }
        }
        if let Some(props) = node.get("window_properties") {
            if let Some(class) = props.get("class").and_then(|v| v.as_str()) {
                if !class.is_empty() {
                    return Some(class.to_string());
                }
            }
        }
        let name = node.get("name").and_then(|v| v.as_str()).unwrap_or("");
        if !name.is_empty() {
            return Some(name.to_string());
        }
    }

    // Recurse into child nodes
    if let Some(nodes) = node.get("nodes").and_then(|v| v.as_array()) {
        for child in nodes {
            if let Some(result) = find_sway_focused(child) {
                return Some(result);
            }
        }
    }
    if let Some(nodes) = node.get("floating_nodes").and_then(|v| v.as_array()) {
        for child in nodes {
            if let Some(result) = find_sway_focused(child) {
                return Some(result);
            }
        }
    }

    None
}

/// X11 / Windows / macOS: use active-win-pos-rs
fn get_active_window_x11() -> Result<Option<String>, String> {
    match get_active_window() {
        Ok(window) => {
            // Prefer the app_name (process name / window class), fall back to title
            let name = if !window.app_name.is_empty() {
                window.app_name
            } else if !window.title.is_empty() {
                window.title
            } else {
                return Ok(None);
            };

            // On Windows, strip the .exe extension from app names
            #[cfg(target_os = "windows")]
            let name = name.strip_suffix(".exe").unwrap_or(&name).to_string();

            Ok(Some(name))
        }
        Err(_) => {
            // Window detection can fail transiently (e.g., desktop focused, screen locked)
            // This is not an error worth logging every second
            Ok(None)
        }
    }
}

/// Extract application name from window class or title
pub fn extract_app_name(window_name: &str) -> Option<String> {
    if window_name.is_empty() {
        return None;
    }

    // Normalize the name
    let name_lower = window_name.to_lowercase();

    // Fast path: try exact match first (handles X11 class names like "firefox", "discord")
    if let Some(&display_name) = EXACT_MATCH_MAP.get(name_lower.as_str()) {
        return Some(display_name.to_string());
    }

    // Special case for VS Code (check window title pattern)
    if window_name.contains("- Code") {
        return Some("Visual Studio Code".to_string());
    }

    // Special case for Digital Wellbeing (check window title)
    if window_name.contains("Digital Wellbeing") {
        return Some("Digital Wellbeing".to_string());
    }

    // Handle Wayland reverse-DNS class names (e.g. "com.mitchellh.ghostty", "org.gnome.Nautilus")
    // Try matching each segment (e.g. "com.spotify.Client" -> try "client", "spotify", "com")
    if name_lower.contains('.') {
        for segment in name_lower.split('.') {
            if segment.is_empty() {
                continue;
            }
            // Try exact match on segment
            if let Some(&display_name) = EXACT_MATCH_MAP.get(segment) {
                return Some(display_name.to_string());
            }
            // Try contains patterns on segment
            for mapping in APP_MAPPINGS.iter() {
                if let Some(pattern) = mapping.contains {
                    if segment.contains(pattern) {
                        return Some(mapping.display_name.to_string());
                    }
                }
            }
        }
    }

    // Slow path: search through contains patterns against the full name
    for mapping in APP_MAPPINGS.iter() {
        if let Some(pattern) = mapping.contains {
            if name_lower.contains(pattern) {
                return Some(mapping.display_name.to_string());
            }
        }
    }

    // Fallback: for reverse-DNS names, use the last segment capitalized
    // e.g. "Dev.zed.Zed" -> "Zed", "org.telegram.desktop" would already be caught above
    if window_name.contains('.') {
        let last = window_name.rsplit('.').next().unwrap_or(window_name);
        let app_name = capitalize_first(last);
        if app_name.len() < 2 {
            return None;
        }
        return Some(app_name);
    }

    // Generic fallback: capitalize first letter
    let app_name = capitalize_first(window_name);

    if app_name.len() < 2 {
        None
    } else {
        Some(app_name)
    }
}

/// Capitalize the first character of a string
fn capitalize_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_app_name_exact_matches() {
        assert_eq!(extract_app_name("firefox"), Some("Firefox".to_string()));
        assert_eq!(extract_app_name("discord"), Some("Discord".to_string()));
        assert_eq!(extract_app_name("spotify"), Some("Spotify".to_string()));
        assert_eq!(
            extract_app_name("code"),
            Some("Visual Studio Code".to_string())
        );
        assert_eq!(extract_app_name("zed"), Some("Zed".to_string()));
    }

    #[test]
    fn test_extract_app_name_contains_patterns() {
        assert_eq!(
            extract_app_name("Mozilla Firefox"),
            Some("Firefox".to_string())
        );
        assert_eq!(
            extract_app_name("alacritty-terminal"),
            Some("Alacritty".to_string())
        );
        assert_eq!(
            extract_app_name("org.telegram.desktop"),
            Some("Telegram".to_string())
        );
    }

    #[test]
    fn test_extract_app_name_wayland_reverse_dns() {
        // Wayland apps report reverse-DNS class names
        assert_eq!(
            extract_app_name("com.mitchellh.ghostty"),
            Some("Ghostty".to_string())
        );
        assert_eq!(
            extract_app_name("org.gnome.Nautilus"),
            Some("Files".to_string())
        );
        assert_eq!(extract_app_name("Dev.zed.Zed"), Some("Zed".to_string()));
        assert_eq!(
            extract_app_name("org.mozilla.firefox"),
            Some("Firefox".to_string())
        );
        assert_eq!(
            extract_app_name("com.spotify.Client"),
            Some("Spotify".to_string())
        );
        // Unknown reverse-DNS should use last segment
        assert_eq!(
            extract_app_name("com.example.MyApp"),
            Some("MyApp".to_string())
        );
    }

    #[test]
    fn test_extract_app_name_vscode_window_title() {
        assert_eq!(
            extract_app_name("main.rs - Wellbeing - Code"),
            Some("Visual Studio Code".to_string())
        );
    }

    #[test]
    fn test_extract_app_name_digital_wellbeing() {
        assert_eq!(
            extract_app_name("Digital Wellbeing"),
            Some("Digital Wellbeing".to_string())
        );
    }

    #[test]
    fn test_extract_app_name_fallback() {
        // Unknown apps should have first letter capitalized
        assert_eq!(
            extract_app_name("unknownapp"),
            Some("Unknownapp".to_string())
        );
        assert_eq!(
            extract_app_name("myCustomApp"),
            Some("MyCustomApp".to_string())
        );
    }

    #[test]
    fn test_extract_app_name_empty() {
        assert_eq!(extract_app_name(""), None);
    }

    #[test]
    fn test_extract_app_name_single_char() {
        // Single character app names are rejected
        assert_eq!(extract_app_name("a"), None);
    }

    #[test]
    fn test_capitalize_first() {
        assert_eq!(capitalize_first("hello"), "Hello");
        assert_eq!(capitalize_first("HELLO"), "HELLO");
        assert_eq!(capitalize_first("hELLO"), "HELLO");
        assert_eq!(capitalize_first(""), "");
        assert_eq!(capitalize_first("a"), "A");
    }

    #[test]
    fn test_case_insensitive_matching() {
        assert_eq!(extract_app_name("FIREFOX"), Some("Firefox".to_string()));
        assert_eq!(extract_app_name("Firefox"), Some("Firefox".to_string()));
        assert_eq!(extract_app_name("DISCORD"), Some("Discord".to_string()));
    }

    #[test]
    fn test_browser_detection() {
        assert_eq!(
            extract_app_name("google-chrome"),
            Some("Chrome".to_string())
        );
        assert_eq!(extract_app_name("chromium"), Some("Chromium".to_string()));
        assert_eq!(extract_app_name("brave-browser"), Some("Brave".to_string()));
    }

    #[test]
    fn test_terminal_detection() {
        assert_eq!(extract_app_name("kitty"), Some("kitty".to_string()));
        assert_eq!(extract_app_name("ghostty"), Some("Ghostty".to_string()));
        assert_eq!(extract_app_name("foot"), Some("Foot".to_string()));
        assert_eq!(extract_app_name("wezterm-gui"), Some("WezTerm".to_string()));
    }

    #[test]
    fn test_windows_app_detection() {
        assert_eq!(
            extract_app_name("explorer"),
            Some("File Explorer".to_string())
        );
        assert_eq!(extract_app_name("cmd"), Some("Command Prompt".to_string()));
        assert_eq!(
            extract_app_name("powershell"),
            Some("PowerShell".to_string())
        );
    }
}
