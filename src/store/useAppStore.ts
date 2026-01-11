import { create } from "zustand";
import type { Theme, DailyStats, WeeklyStats, AppLimit, HourlyUsage, CategoryUsage } from "../types";
import { api } from "../services/api";

interface LoadingState {
  theme: boolean;
  dailyStats: boolean;
  weeklyStats: boolean;
  hourlyUsage: boolean;
  categoryUsage: boolean;
  appLimits: boolean;
  blockedApps: boolean;
}

interface AppState {
  theme: Theme | null;
  dailyStats: DailyStats | null;
  weeklyStats: WeeklyStats | null;
  hourlyUsage: HourlyUsage[];
  categoryUsage: CategoryUsage[];
  appLimits: AppLimit[];
  blockedApps: string[];
  loading: LoadingState;
  error: string | null;
  activeTab: "dashboard" | "limits" | "settings";

  // Computed helper for backwards compatibility
  isLoading: boolean;
  isInitialLoad: () => boolean;

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

const initialLoadingState: LoadingState = {
  theme: false,
  dailyStats: false,
  weeklyStats: false,
  hourlyUsage: false,
  categoryUsage: false,
  appLimits: false,
  blockedApps: false,
};

export const useAppStore = create<AppState>((set, get) => ({
  theme: defaultTheme,
  dailyStats: null,
  weeklyStats: null,
  hourlyUsage: [],
  categoryUsage: [],
  appLimits: [],
  blockedApps: [],
  loading: { ...initialLoadingState },
  error: null,
  activeTab: "dashboard",

  // Computed: true if ANY loading operation is in progress
  get isLoading() {
    const { loading } = get();
    return Object.values(loading).some(Boolean);
  },

  // Check if this is the initial load (no data yet)
  isInitialLoad: () => {
    const state = get();
    return state.dailyStats === null && state.weeklyStats === null;
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  loadTheme: async () => {
    try {
      set((state) => ({ loading: { ...state.loading, theme: true } }));
      const theme = await api.getTheme();
      set((state) => ({ theme, loading: { ...state.loading, theme: false } }));
    } catch (error) {
      console.error("Failed to load theme:", error);
      set((state) => ({ theme: defaultTheme, loading: { ...state.loading, theme: false } }));
    }
  },

  loadDailyStats: async () => {
    try {
      set((state) => ({ loading: { ...state.loading, dailyStats: true }, error: null }));
      const dailyStats = await api.getDailyUsage();
      set((state) => ({ dailyStats, loading: { ...state.loading, dailyStats: false } }));
    } catch (error) {
      console.error("Failed to load daily stats:", error);
      set((state) => ({ error: String(error), loading: { ...state.loading, dailyStats: false } }));
    }
  },

  loadWeeklyStats: async () => {
    try {
      set((state) => ({ loading: { ...state.loading, weeklyStats: true }, error: null }));
      const weeklyStats = await api.getWeeklyStats();
      set((state) => ({ weeklyStats, loading: { ...state.loading, weeklyStats: false } }));
    } catch (error) {
      console.error("Failed to load weekly stats:", error);
      set((state) => ({ error: String(error), loading: { ...state.loading, weeklyStats: false } }));
    }
  },

  loadHourlyUsage: async () => {
    try {
      set((state) => ({ loading: { ...state.loading, hourlyUsage: true } }));
      const hourlyUsage = await api.getHourlyUsage();
      set((state) => ({ hourlyUsage, loading: { ...state.loading, hourlyUsage: false } }));
    } catch (error) {
      console.error("Failed to load hourly usage:", error);
      set((state) => ({ loading: { ...state.loading, hourlyUsage: false } }));
    }
  },

  loadCategoryUsage: async () => {
    try {
      set((state) => ({ loading: { ...state.loading, categoryUsage: true } }));
      const categoryUsage = await api.getCategoryUsage();
      set((state) => ({ categoryUsage, loading: { ...state.loading, categoryUsage: false } }));
    } catch (error) {
      console.error("Failed to load category usage:", error);
      set((state) => ({ loading: { ...state.loading, categoryUsage: false } }));
    }
  },

  loadAppLimits: async () => {
    try {
      set((state) => ({ loading: { ...state.loading, appLimits: true } }));
      const appLimits = await api.getAppLimits();
      set((state) => ({ appLimits, loading: { ...state.loading, appLimits: false } }));
    } catch (error) {
      console.error("Failed to load app limits:", error);
      set((state) => ({ loading: { ...state.loading, appLimits: false } }));
    }
  },

  loadBlockedApps: async () => {
    try {
      set((state) => ({ loading: { ...state.loading, blockedApps: true } }));
      const blockedApps = await api.getBlockedApps();
      set((state) => ({ blockedApps, loading: { ...state.loading, blockedApps: false } }));
    } catch (error) {
      console.error("Failed to load blocked apps:", error);
      set((state) => ({ loading: { ...state.loading, blockedApps: false } }));
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
