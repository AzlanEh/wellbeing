use dirs;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ThemeColors {
    pub primary: String,
    pub secondary: String,
    pub background: String,
    pub surface: String,
    pub text: String,
    #[serde(rename = "textSecondary")]
    pub text_secondary: String,
    pub accent: String,
    pub warning: String,
    pub danger: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ThemeFonts {
    pub family: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Theme {
    pub colors: ThemeColors,
    pub fonts: ThemeFonts,
}

impl Default for Theme {
    fn default() -> Self {
        Theme {
            colors: ThemeColors {
                primary: "#4F46E5".to_string(),
                secondary: "#818CF8".to_string(),
                background: "#FFFFFF".to_string(),
                surface: "#F3F4F6".to_string(),
                text: "#1F2937".to_string(),
                text_secondary: "#6B7280".to_string(),
                accent: "#10B981".to_string(),
                warning: "#F59E0B".to_string(),
                danger: "#EF4444".to_string(),
            },
            fonts: ThemeFonts {
                family: "Inter, sans-serif".to_string(),
            },
        }
    }
}

pub struct ThemeLoader;

impl ThemeLoader {
    pub fn load() -> Theme {
        if let Some(config_dir) = dirs::config_dir() {
            let theme_path = config_dir.join("wellbeing").join("theme.json");

            if theme_path.exists() {
                if let Ok(content) = fs::read_to_string(&theme_path) {
                    if let Ok(theme) = serde_json::from_str::<Theme>(&content) {
                        return theme;
                    }
                }
            }
        }

        Theme::default()
    }

    pub fn get_theme_path() -> Option<PathBuf> {
        if let Some(config_dir) = dirs::config_dir() {
            let theme_dir = config_dir.join("wellbeing");
            let theme_path = theme_dir.join("theme.json");

            if !theme_dir.exists() {
                let _ = fs::create_dir_all(&theme_dir);
            }

            Some(theme_path)
        } else {
            None
        }
    }

    pub fn save_default_theme() -> Result<(), String> {
        if let Some(theme_path) = Self::get_theme_path() {
            let default_theme = Theme::default();
            let json = serde_json::to_string_pretty(&default_theme)
                .map_err(|e| format!("Failed to serialize theme: {}", e))?;

            fs::write(theme_path, json)
                .map_err(|e| format!("Failed to write theme file: {}", e))?;

            Ok(())
        } else {
            Err("Config directory not found".to_string())
        }
    }
}
