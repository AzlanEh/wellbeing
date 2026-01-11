export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    accent: string;
    warning: string;
    danger: string;
  };
  fonts: {
    family: string;
  };
}

export interface AppUsage {
  app_name: string;
  duration_seconds: number;
  session_count: number;
  category: string | null;
}

export interface DailyStats {
  total_seconds: number;
  apps: AppUsage[];
}

export interface DayStats {
  date: string;
  timestamp: number;
  total_seconds: number;
}

export interface WeeklyStats {
  days: DayStats[];
  total_seconds: number;
}

export interface AppLimit {
  id: number;
  app_id: number;
  app_name: string;
  daily_limit_minutes: number;
  block_when_exceeded: boolean;
}

export interface App {
  id: number;
  name: string;
  path: string | null;
  icon_path: string | null;
  category: string | null;
  is_blocked: boolean;
  created_at: number;
}

export interface HourlyUsage {
  hour: number;
  total_seconds: number;
}

export interface CategoryUsage {
  category: string;
  total_seconds: number;
  app_count: number;
}

export interface InstalledApp {
  name: string;
  exec: string | null;
  icon: string | null;
  desktop_file: string;
  categories: string[];
}

export interface AutostartStatus {
  enabled: boolean;
  systemd_installed: boolean;
  systemd_running: boolean;
  xdg_installed: boolean;
}

export const APP_CATEGORIES = [
  "Productivity",
  "Development",
  "Communication",
  "Entertainment",
  "Social Media",
  "Gaming",
  "Utilities",
  "Education",
  "Other",
] as const;

export type AppCategory = typeof APP_CATEGORIES[number];
