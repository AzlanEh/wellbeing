import { invoke } from "@tauri-apps/api/core";
import type {
  Theme,
  DailyStats,
  WeeklyStats,
  AppLimit,
  App,
  HourlyUsage,
  CategoryUsage,
  InstalledApp,
  AutostartStatus,
  ExportRecord,
  BreakSettings,
  BreakStatus,
  HistoricalData,
  NotificationSettings,
  FocusSettings,
  FocusSession,
  Goal,
  GoalProgress,
  Achievement,
  GoalsStats,
} from "../types";

export const api = {
  getDailyUsage: (): Promise<DailyStats> => {
    return invoke("get_daily_usage");
  },

  getWeeklyStats: (): Promise<WeeklyStats> => {
    return invoke("get_weekly_stats");
  },

  setAppLimit: (appName: string, minutes: number, blockWhenExceeded?: boolean): Promise<void> => {
    return invoke("set_app_limit", { appName, minutes, blockWhenExceeded });
  },

  getAppLimits: (): Promise<AppLimit[]> => {
    return invoke("get_app_limits");
  },

  removeAppLimit: (appName: string): Promise<void> => {
    return invoke("remove_app_limit", { appName });
  },

  getTheme: (): Promise<Theme> => {
    return invoke("get_theme");
  },

  getThemePath: (): Promise<string | null> => {
    return invoke("get_theme_path");
  },

  getAllApps: (): Promise<App[]> => {
    return invoke("get_all_apps");
  },

  recordUsage: (appName: string, durationSeconds: number): Promise<void> => {
    return invoke("record_usage", { appName, durationSeconds });
  },

  getHourlyUsage: (): Promise<HourlyUsage[]> => {
    return invoke("get_hourly_usage");
  },

  getCategoryUsage: (): Promise<CategoryUsage[]> => {
    return invoke("get_category_usage");
  },

  setAppCategory: (appName: string, category: string): Promise<void> => {
    return invoke("set_app_category", { appName, category });
  },

  checkAppBlocked: (appName: string): Promise<boolean> => {
    return invoke("check_app_blocked", { appName });
  },

  blockApp: (appName: string): Promise<void> => {
    return invoke("block_app", { appName });
  },

  getBlockedApps: (): Promise<string[]> => {
    return invoke("get_blocked_apps");
  },

  getInstalledApps: (): Promise<InstalledApp[]> => {
    return invoke("get_installed_apps");
  },

  sendTestNotification: (): Promise<void> => {
    return invoke("send_test_notification");
  },

  enableAutostart: (): Promise<string> => {
    return invoke("enable_autostart");
  },

  disableAutostart: (): Promise<string> => {
    return invoke("disable_autostart");
  },

  getAutostartStatus: (): Promise<AutostartStatus> => {
    return invoke("get_autostart_status");
  },

  // Export functionality
  exportUsageData: (startDate: string, endDate: string): Promise<ExportRecord[]> => {
    return invoke("export_usage_data", { startDate, endDate });
  },

  formatExportCsv: (records: ExportRecord[]): Promise<string> => {
    return invoke("format_export_csv", { records });
  },

  formatExportJson: (records: ExportRecord[]): Promise<string> => {
    return invoke("format_export_json", { records });
  },

  // Window control
  minimizeToTray: (): Promise<void> => {
    return invoke("minimize_to_tray");
  },

  showWindow: (): Promise<void> => {
    return invoke("show_window");
  },

  // Break reminder
  getBreakSettings: (): Promise<BreakSettings> => {
    return invoke("get_break_settings");
  },

  setBreakSettings: (settings: BreakSettings): Promise<void> => {
    return invoke("set_break_settings", { settings });
  },

  getBreakStatus: (): Promise<BreakStatus> => {
    return invoke("get_break_status");
  },

  startBreak: (): Promise<void> => {
    return invoke("start_break");
  },

  endBreak: (): Promise<void> => {
    return invoke("end_break");
  },

  resetBreakTimer: (): Promise<void> => {
    return invoke("reset_break_timer");
  },

  // Historical data
  getHistoricalData: (startDate: string, endDate: string): Promise<HistoricalData> => {
    return invoke("get_historical_data", { startDate, endDate });
  },

  // Notification settings
  getNotificationSettings: (): Promise<NotificationSettings> => {
    return invoke("get_notification_settings");
  },

  setNotificationSettings: (settings: NotificationSettings): Promise<void> => {
    return invoke("set_notification_settings", { settings });
  },

  muteNotifications: (): Promise<void> => {
    return invoke("mute_notifications");
  },

  unmuteNotifications: (): Promise<void> => {
    return invoke("unmute_notifications");
  },

  isNotificationsMuted: (): Promise<boolean> => {
    return invoke("is_notifications_muted");
  },

  // Focus mode
  getFocusSettings: (): Promise<FocusSettings> => {
    return invoke("get_focus_settings");
  },

  setFocusSettings: (settings: FocusSettings): Promise<void> => {
    return invoke("set_focus_settings", { settings });
  },

  getFocusSession: (): Promise<FocusSession> => {
    return invoke("get_focus_session");
  },

  startFocusSession: (durationMinutes?: number, blockedApps?: string[]): Promise<FocusSession> => {
    return invoke("start_focus_session", { durationMinutes, blockedApps });
  },

  stopFocusSession: (): Promise<FocusSession> => {
    return invoke("stop_focus_session");
  },

  extendFocusSession: (additionalMinutes: number): Promise<FocusSession | null> => {
    return invoke("extend_focus_session", { additionalMinutes });
  },

  isFocusModeActive: (): Promise<boolean> => {
    return invoke("is_focus_mode_active");
  },

  shouldBlockAppFocus: (appName: string): Promise<boolean> => {
    return invoke("should_block_app_focus", { appName });
  },

  addFocusBlockedApp: (appName: string): Promise<void> => {
    return invoke("add_focus_blocked_app", { appName });
  },

  removeFocusBlockedApp: (appName: string): Promise<void> => {
    return invoke("remove_focus_blocked_app", { appName });
  },

  // Goals
  getGoals: (): Promise<Goal[]> => {
    return invoke("get_goals");
  },

  addGoal: (goal: Goal): Promise<void> => {
    return invoke("add_goal", { goal });
  },

  updateGoal: (goal: Goal): Promise<void> => {
    return invoke("update_goal", { goal });
  },

  removeGoal: (goalId: string): Promise<void> => {
    return invoke("remove_goal", { goalId });
  },

  getGoalsProgress: (): Promise<GoalProgress[]> => {
    return invoke("get_goals_progress");
  },

  getAchievements: (): Promise<Achievement[]> => {
    return invoke("get_achievements");
  },

  getGoalsStats: (): Promise<GoalsStats> => {
    return invoke("get_goals_stats");
  },
};
