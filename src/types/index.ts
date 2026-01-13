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

export interface ExportRecord {
  date: string;
  app_name: string;
  category: string;
  duration_seconds: number;
  session_count: number;
}

export interface BreakSettings {
  enabled: boolean;
  work_minutes: number;
  break_minutes: number;
  show_notification: boolean;
  play_sound: boolean;
}

export interface BreakStatus {
  enabled: boolean;
  minutes_worked: number;
  work_minutes: number;
  is_on_break: boolean;
}

export interface HistoricalData {
  daily_totals: DayStats[];
  app_usage: AppUsage[];
  category_usage: CategoryUsage[];
  total_seconds: number;
}

export interface NotificationSettings {
  enabled: boolean;
  warning_threshold: number; // percentage (e.g., 80)
  exceeded_threshold: number; // percentage (e.g., 100)
  dnd_enabled: boolean;
  dnd_start_hour: number; // 0-23
  dnd_end_hour: number; // 0-23
}

export interface FocusSettings {
  blocked_apps: string[];
  default_duration_minutes: number;
  notify_on_start: boolean;
  notify_on_end: boolean;
  block_notifications: boolean;
  schedules: FocusSchedule[];
}

export interface FocusSchedule {
  id: string;
  name: string;
  days: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  blocked_apps: string[];
  enabled: boolean;
}

export interface FocusSession {
  is_active: boolean;
  start_time: number | null;
  end_time: number | null;
  duration_minutes: number | null;
  minutes_remaining: number | null;
  blocked_apps: string[];
  is_scheduled: boolean;
  schedule_name: string | null;
}

// Goal types
export type GoalType =
  | { daily_limit: Record<string, never> }
  | { app_limit: { app_name: string } }
  | { category_limit: { category: string } }
  | { minimum_productive: { category: string } };

export interface Goal {
  id: string;
  name: string;
  goal_type: GoalType;
  target_minutes: number;
  days: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday (empty = every day)
  enabled: boolean;
  created_at: string;
}

export type GoalStatus =
  | "on_track"
  | "warning"
  | "exceeded"
  | "achieved"
  | "not_started";

export interface GoalProgress {
  goal_id: string;
  goal_name: string;
  goal_type: GoalType;
  target_minutes: number;
  current_minutes: number;
  progress_percent: number;
  is_met: boolean;
  status: GoalStatus;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string | null;
  progress: number;
  target: number;
}

export interface GoalsStats {
  current_streak: number;
  longest_streak: number;
  total_goals_met: number;
  focus_sessions_completed: number;
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
