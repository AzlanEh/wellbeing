import { create } from "zustand";
import type { Theme, DailyStats, WeeklyStats, AppLimit, HourlyUsage, CategoryUsage } from "../types";
import { api } from "../services/api";

interface AppState {
  theme: Theme | null;
  dailyStats: DailyStats | null;
  weeklyStats: WeeklyStats | null;
  hourlyUsage: HourlyUsage[];
  categoryUsage: CategoryUsage[];
  appLimits: AppLimit[];
  blockedApps: string[];
  isLoading: boolean;
  error: string | null;
  activeTab: "dashboard" | "limits" | "settings";

  setActiveTab: (tab: "dashboard" | "limits" | "settings") => void;
  loadTheme: () => Promise<void>;
  loadDailyStats: () => Promise<void>;
  loadWeeklyStats: () => Promise<void>;
  loadHourlyUsage: () => Promise<void>;
  loadCategoryUsage: () => Promise<void>;
  loadAppLimits: () => Promise<void>;
  loadBlockedApps: () => Promise<void>;
  setAppLimit: (appName: string, minutes: number, blockWhenExceeded?: boolean) => Promise<void>;
  removeAppLimit: (appName: string) => Promise<void>;
  setAppCategory: (appName: string, category: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const defaultTheme: Theme = {
  colors: {
    primary: "#4F46E5",
    secondary: "#818CF8",
    background: "#FFFFFF",
    surface: "#F3F4F6",
    text: "#1F2937",
    textSecondary: "#6B7280",
    accent: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
  },
  fonts: {
    family: "Inter, sans-serif",
  },
};

export const useAppStore = create<AppState>((set, get) => ({
  theme: defaultTheme,
  dailyStats: null,
  weeklyStats: null,
  hourlyUsage: [],
  categoryUsage: [],
  appLimits: [],
  blockedApps: [],
  isLoading: false,
  error: null,
  activeTab: "dashboard",

  setActiveTab: (tab) => set({ activeTab: tab }),

  loadTheme: async () => {
    try {
      const theme = await api.getTheme();
      set({ theme });
    } catch (error) {
      console.error("Failed to load theme:", error);
      set({ theme: defaultTheme });
    }
  },

  loadDailyStats: async () => {
    try {
      set({ isLoading: true, error: null });
      const dailyStats = await api.getDailyUsage();
      set({ dailyStats, isLoading: false });
    } catch (error) {
      console.error("Failed to load daily stats:", error);
      set({ error: String(error), isLoading: false });
    }
  },

  loadWeeklyStats: async () => {
    try {
      set({ isLoading: true, error: null });
      const weeklyStats = await api.getWeeklyStats();
      set({ weeklyStats, isLoading: false });
    } catch (error) {
      console.error("Failed to load weekly stats:", error);
      set({ error: String(error), isLoading: false });
    }
  },

  loadHourlyUsage: async () => {
    try {
      const hourlyUsage = await api.getHourlyUsage();
      set({ hourlyUsage });
    } catch (error) {
      console.error("Failed to load hourly usage:", error);
    }
  },

  loadCategoryUsage: async () => {
    try {
      const categoryUsage = await api.getCategoryUsage();
      set({ categoryUsage });
    } catch (error) {
      console.error("Failed to load category usage:", error);
    }
  },

  loadAppLimits: async () => {
    try {
      const appLimits = await api.getAppLimits();
      set({ appLimits });
    } catch (error) {
      console.error("Failed to load app limits:", error);
    }
  },

  loadBlockedApps: async () => {
    try {
      const blockedApps = await api.getBlockedApps();
      set({ blockedApps });
    } catch (error) {
      console.error("Failed to load blocked apps:", error);
    }
  },

  setAppLimit: async (appName, minutes, blockWhenExceeded = false) => {
    try {
      await api.setAppLimit(appName, minutes, blockWhenExceeded);
      await get().loadAppLimits();
    } catch (error) {
      console.error("Failed to set app limit:", error);
      set({ error: String(error) });
    }
  },

  removeAppLimit: async (appName) => {
    try {
      await api.removeAppLimit(appName);
      await get().loadAppLimits();
    } catch (error) {
      console.error("Failed to remove app limit:", error);
      set({ error: String(error) });
    }
  },

  setAppCategory: async (appName, category) => {
    try {
      await api.setAppCategory(appName, category);
      await get().loadDailyStats();
      await get().loadCategoryUsage();
    } catch (error) {
      console.error("Failed to set app category:", error);
      set({ error: String(error) });
    }
  },

  refreshAll: async () => {
    const { 
      loadDailyStats, 
      loadWeeklyStats, 
      loadAppLimits, 
      loadTheme,
      loadHourlyUsage,
      loadCategoryUsage,
      loadBlockedApps,
    } = get();
    await Promise.all([
      loadTheme(),
      loadDailyStats(),
      loadWeeklyStats(),
      loadAppLimits(),
      loadHourlyUsage(),
      loadCategoryUsage(),
      loadBlockedApps(),
    ]);
  },
}));
