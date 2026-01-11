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
};
