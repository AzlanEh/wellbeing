use once_cell::sync::Lazy;
use serde::Deserialize;
use std::collections::HashMap;
use std::process::Command;

#[derive(Debug, Deserialize)]
struct HyprlandWindow {
    class: Option<String>,
    title: Option<String>,
}

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

    // Fast path: try exact match first
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

    // Slow path: search through contains patterns
    for mapping in APP_MAPPINGS.iter() {
        if let Some(pattern) = mapping.contains {
            if name_lower.contains(pattern) {
                return Some(mapping.display_name.to_string());
            }
        }
    }

    // Fallback: use the class name directly, capitalize first letter
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
}
