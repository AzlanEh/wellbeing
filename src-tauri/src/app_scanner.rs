use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledApp {
    pub name: String,
    pub exec: Option<String>,
    pub icon: Option<String>,
    pub desktop_file: String,
    pub categories: Vec<String>,
}

/// Get all installed applications from .desktop files
pub fn get_installed_apps() -> Vec<InstalledApp> {
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

/// Parse a .desktop file and extract app information
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
        "Desktop", "Files", "Software", "Settings", "Terminal",
        "Archive Manager", "Disk Usage", "System Monitor",
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

/// Clean the Exec field by removing field codes like %u, %U, %f, %F, etc.
fn clean_exec(exec: &str) -> String {
    let mut result = exec.to_string();
    // Remove common field codes
    for code in &["%u", "%U", "%f", "%F", "%i", "%c", "%k", "%d", "%D", "%n", "%N", "%v", "%m"] {
        result = result.replace(code, "");
    }
    result.trim().to_string()
}

/// Map app categories from .desktop to our simplified categories
pub fn map_category(desktop_categories: &[String]) -> Option<String> {
    for cat in desktop_categories {
        let cat_lower = cat.to_lowercase();
        
        // Development
        if cat_lower.contains("development") || cat_lower.contains("ide") || cat_lower.contains("texteditor") {
            return Some("Development".to_string());
        }
        
        // Communication
        if cat_lower.contains("email") || cat_lower.contains("instantmessaging") 
            || cat_lower.contains("chat") || cat_lower.contains("telephony") {
            return Some("Communication".to_string());
        }
        
        // Entertainment/Media
        if cat_lower.contains("video") || cat_lower.contains("audio") 
            || cat_lower.contains("music") || cat_lower.contains("player") {
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
        if cat_lower.contains("office") || cat_lower.contains("wordprocessor")
            || cat_lower.contains("spreadsheet") || cat_lower.contains("presentation") {
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
