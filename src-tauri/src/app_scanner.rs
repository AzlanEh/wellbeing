use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledApp {
    pub name: String,
    pub exec: Option<String>,
    pub icon: Option<String>,
    pub desktop_file: String,
    pub categories: Vec<String>,
}

/// Get all installed applications (cross-platform)
pub fn get_installed_apps() -> Vec<InstalledApp> {
    #[cfg(target_os = "linux")]
    {
        get_installed_apps_linux()
    }

    #[cfg(target_os = "windows")]
    {
        get_installed_apps_windows()
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        Vec::new()
    }
}

/// Get all installed applications from .desktop files (Linux)
#[cfg(target_os = "linux")]
fn get_installed_apps_linux() -> Vec<InstalledApp> {
    let mut apps = Vec::new();

    // Standard locations for .desktop files
    let desktop_dirs = vec![
        PathBuf::from("/usr/share/applications"),
        PathBuf::from("/usr/local/share/applications"),
        dirs::home_dir()
            .map(|h| h.join(".local/share/applications"))
            .unwrap_or_default(),
        // Flatpak apps
        PathBuf::from("/var/lib/flatpak/exports/share/applications"),
        dirs::home_dir()
            .map(|h| h.join(".local/share/flatpak/exports/share/applications"))
            .unwrap_or_default(),
        // Snap apps
        PathBuf::from("/var/lib/snapd/desktop/applications"),
    ];

    for dir in desktop_dirs {
        if dir.exists() && dir.is_dir() {
            if let Ok(entries) = fs::read_dir(&dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().map_or(false, |ext| ext == "desktop") {
                        if let Some(app) = parse_desktop_file(&path) {
                            // Avoid duplicates by name
                            if !apps.iter().any(|a: &InstalledApp| a.name == app.name) {
                                apps.push(app);
                            }
                        }
                    }
                }
            }
        }
    }

    // Sort by name
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps
}

/// Get installed applications on Windows from Start Menu shortcuts and registry
#[cfg(target_os = "windows")]
fn get_installed_apps_windows() -> Vec<InstalledApp> {
    let mut apps = Vec::new();

    // Scan Start Menu shortcuts (.lnk files)
    let start_menu_dirs: Vec<PathBuf> = vec![
        // Common (all users) Start Menu
        std::env::var("ProgramData")
            .map(|p| PathBuf::from(p).join("Microsoft\\Windows\\Start Menu\\Programs"))
            .unwrap_or_default(),
        // Current user Start Menu
        dirs::data_dir()
            .map(|p| {
                p.parent()
                    .unwrap_or(&p)
                    .join("Roaming\\Microsoft\\Windows\\Start Menu\\Programs")
            })
            .unwrap_or_default(),
    ];

    for dir in start_menu_dirs {
        if dir.exists() && dir.is_dir() {
            scan_start_menu_dir(&dir, &mut apps);
        }
    }

    // Scan registry for installed programs
    scan_registry_apps(&mut apps);

    // Sort by name
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    // Deduplicate by name
    apps.dedup_by(|a, b| a.name.to_lowercase() == b.name.to_lowercase());

    apps
}

/// Recursively scan Start Menu directories for .lnk shortcut files (Windows)
#[cfg(target_os = "windows")]
fn scan_start_menu_dir(dir: &PathBuf, apps: &mut Vec<InstalledApp>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                // Recurse into subdirectories (program groups)
                scan_start_menu_dir(&path, apps);
            } else if path.extension().map_or(false, |ext| ext == "lnk") {
                // Extract name from .lnk filename (without extension)
                if let Some(name) = path.file_stem().and_then(|n| n.to_str()) {
                    let name = name.to_string();

                    // Skip common uninstallers and system utilities
                    let skip_patterns = [
                        "uninstall",
                        "readme",
                        "help",
                        "license",
                        "changelog",
                        "release notes",
                        "website",
                        "documentation",
                    ];
                    if skip_patterns
                        .iter()
                        .any(|p| name.to_lowercase().contains(p))
                    {
                        continue;
                    }

                    if !apps.iter().any(|a| a.name == name) {
                        apps.push(InstalledApp {
                            name,
                            exec: Some(path.to_string_lossy().to_string()),
                            icon: None,
                            desktop_file: path
                                .file_name()
                                .unwrap_or_default()
                                .to_string_lossy()
                                .to_string(),
                            categories: Vec::new(),
                        });
                    }
                }
            }
        }
    }
}

/// Scan Windows registry for installed programs
#[cfg(target_os = "windows")]
fn scan_registry_apps(apps: &mut Vec<InstalledApp>) {
    use winreg::enums::*;
    use winreg::RegKey;

    let registry_paths = [
        (
            HKEY_LOCAL_MACHINE,
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        ),
        (
            HKEY_LOCAL_MACHINE,
            "SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        ),
        (
            HKEY_CURRENT_USER,
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        ),
    ];

    for (hkey, path) in &registry_paths {
        let Ok(key) = RegKey::predef(*hkey).open_subkey_with_flags(path, KEY_READ) else {
            continue;
        };

        for name in key.enum_keys().flatten() {
            let Ok(subkey) = key.open_subkey_with_flags(&name, KEY_READ) else {
                continue;
            };

            // Skip system components and entries without display names
            let is_system: bool = subkey.get_value("SystemComponent").unwrap_or(0u32) == 1;
            if is_system {
                continue;
            }

            let display_name: String = match subkey.get_value("DisplayName") {
                Ok(name) => name,
                Err(_) => continue,
            };

            // Skip if name is empty or already exists
            if display_name.is_empty() || apps.iter().any(|a| a.name == display_name) {
                continue;
            }

            let install_location: Option<String> = subkey.get_value("InstallLocation").ok();
            let display_icon: Option<String> = subkey.get_value("DisplayIcon").ok();

            apps.push(InstalledApp {
                name: display_name,
                exec: install_location,
                icon: display_icon,
                desktop_file: name,
                categories: Vec::new(),
            });
        }
    }
}

/// Parse a .desktop file and extract app information (Linux only)
#[cfg(target_os = "linux")]
fn parse_desktop_file(path: &PathBuf) -> Option<InstalledApp> {
    let content = fs::read_to_string(path).ok()?;

    let mut name: Option<String> = None;
    let mut exec: Option<String> = None;
    let mut icon: Option<String> = None;
    let mut categories: Vec<String> = Vec::new();
    let mut no_display = false;
    let mut hidden = false;
    let mut app_type: Option<String> = None;

    let mut in_desktop_entry = false;

    for line in content.lines() {
        let line = line.trim();

        // Track which section we're in
        if line.starts_with('[') {
            in_desktop_entry = line == "[Desktop Entry]";
            continue;
        }

        if !in_desktop_entry {
            continue;
        }

        if let Some((key, value)) = line.split_once('=') {
            let key = key.trim();
            let value = value.trim();

            match key {
                "Name" if name.is_none() => name = Some(value.to_string()),
                "Exec" => exec = Some(clean_exec(value)),
                "Icon" => icon = Some(value.to_string()),
                "Categories" => {
                    categories = value
                        .split(';')
                        .filter(|s| !s.is_empty())
                        .map(|s| s.to_string())
                        .collect();
                }
                "NoDisplay" => no_display = value.eq_ignore_ascii_case("true"),
                "Hidden" => hidden = value.eq_ignore_ascii_case("true"),
                "Type" => app_type = Some(value.to_string()),
                _ => {}
            }
        }
    }

    // Skip hidden apps, non-application types, or apps without names
    if no_display || hidden {
        return None;
    }

    if app_type.as_deref() != Some("Application") {
        return None;
    }

    let name = name?;

    // Skip some system utilities that aren't useful to track
    let skip_names = [
        "Desktop",
        "Files",
        "Software",
        "Settings",
        "Terminal",
        "Archive Manager",
        "Disk Usage",
        "System Monitor",
    ];

    if skip_names.iter().any(|s| name.eq_ignore_ascii_case(s)) {
        return None;
    }

    Some(InstalledApp {
        name,
        exec,
        icon,
        desktop_file: path.file_name()?.to_string_lossy().to_string(),
        categories,
    })
}

/// Clean the Exec field by removing field codes like %u, %U, %f, %F, etc. (Linux only)
#[cfg(target_os = "linux")]
fn clean_exec(exec: &str) -> String {
    let mut result = exec.to_string();
    // Remove common field codes
    for code in &[
        "%u", "%U", "%f", "%F", "%i", "%c", "%k", "%d", "%D", "%n", "%N", "%v", "%m",
    ] {
        result = result.replace(code, "");
    }
    result.trim().to_string()
}

/// Map app categories from .desktop to our simplified categories
#[allow(dead_code)]
pub fn map_category(desktop_categories: &[String]) -> Option<String> {
    for cat in desktop_categories {
        let cat_lower = cat.to_lowercase();

        // Development
        if cat_lower.contains("development")
            || cat_lower.contains("ide")
            || cat_lower.contains("texteditor")
        {
            return Some("Development".to_string());
        }

        // Communication
        if cat_lower.contains("email")
            || cat_lower.contains("instantmessaging")
            || cat_lower.contains("chat")
            || cat_lower.contains("telephony")
        {
            return Some("Communication".to_string());
        }

        // Entertainment/Media
        if cat_lower.contains("video")
            || cat_lower.contains("audio")
            || cat_lower.contains("music")
            || cat_lower.contains("player")
        {
            return Some("Entertainment".to_string());
        }

        // Gaming
        if cat_lower.contains("game") {
            return Some("Gaming".to_string());
        }

        // Graphics
        if cat_lower.contains("graphics") || cat_lower.contains("photography") {
            return Some("Productivity".to_string());
        }

        // Office
        if cat_lower.contains("office")
            || cat_lower.contains("wordprocessor")
            || cat_lower.contains("spreadsheet")
            || cat_lower.contains("presentation")
        {
            return Some("Productivity".to_string());
        }

        // Education
        if cat_lower.contains("education") || cat_lower.contains("science") {
            return Some("Education".to_string());
        }

        // Network/Web
        if cat_lower.contains("webbrowser") || cat_lower.contains("network") {
            return Some("Productivity".to_string());
        }

        // Social
        if cat_lower.contains("social") {
            return Some("Social Media".to_string());
        }

        // Utilities
        if cat_lower.contains("utility") || cat_lower.contains("system") {
            return Some("Utilities".to_string());
        }
    }

    None
}
