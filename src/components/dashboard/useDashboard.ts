import { useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import { CATEGORY_COLORS } from "./constants";
import { formatHour } from "@/utils/formatters";

const UNDO_TIMEOUT = 5000;

export const useDashboard = () => {
  const {
    dailyStats,
    weeklyStats,
    hourlyUsage,
    categoryUsage,
    isLoading,
    setAppCategory,
    setAppCategorySilent,
  } = useAppStore();

  // Memoized computations
  const totalToday = dailyStats?.total_seconds || 0;

  const appsToday = useMemo(
    () => dailyStats?.apps.filter((a) => a.duration_seconds > 0) || [],
    [dailyStats]
  );

  const pieData = useMemo(
    () =>
      appsToday.slice(0, 8).map((app) => ({
        name: app.app_name,
        value: app.duration_seconds,
      })),
    [appsToday]
  );

  // Generate last 7 days with data filled in
  const weeklyData = useMemo(() => {
    const days: { name: string; hours: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(12, 0, 0, 0);

      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      const dateStr = date.toISOString().split('T')[0];

      const dayStats = weeklyStats?.days.find((d) => {
        const statsDate = new Date(d.timestamp * 1000);
        const statsDateStr = statsDate.toISOString().split('T')[0];
        return statsDateStr === dateStr;
      });

      days.push({
        name: dayName,
        hours: dayStats
          ? Math.round((dayStats.total_seconds / 3600) * 10) / 10
          : 0,
      });
    }

    return days;
  }, [weeklyStats]);

  const timelineData = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const usage = hourlyUsage.find((h) => h.hour === i);
        return {
          hour: formatHour(i),
          minutes: usage ? Math.round(usage.total_seconds / 60) : 0,
        };
      }),
    [hourlyUsage]
  );

  const categoryData = useMemo(
    () =>
      categoryUsage.map((cat) => ({
        name: cat.category,
        value: cat.total_seconds,
        apps: cat.app_count,
        color: CATEGORY_COLORS[cat.category] || CATEGORY_COLORS["Other"],
      })),
    [categoryUsage]
  );

  // Calculate quick insights
  const insights = useMemo(() => {
    const dailyAverage = weeklyStats ? weeklyStats.total_seconds / 7 : 0;
    const todayVsAvg = dailyAverage > 0 ? ((totalToday - dailyAverage) / dailyAverage) * 100 : 0;

    // Find peak hour
    const peakHour = hourlyUsage.reduce((max, h) =>
      h.total_seconds > (max?.total_seconds || 0) ? h : max,
      hourlyUsage[0]
    );

    // Top category
    const topCategory = categoryData.sort((a, b) => b.value - a.value)[0];

    return {
      todayVsAvg,
      peakHour: peakHour?.hour,
      peakMinutes: peakHour ? Math.round(peakHour.total_seconds / 60) : 0,
      topCategory: topCategory?.name,
      topCategoryTime: topCategory?.value || 0,
    };
  }, [weeklyStats, totalToday, hourlyUsage, categoryData]);

  // Wrapper for category change with undo support
  const handleCategoryChange = useCallback(
    async (appName: string, category: string) => {
      const changeData = await setAppCategory(appName, category);

      if (changeData) {
        const previousCategory = changeData.previousCategory;
        toast(`Category set to ${category}`, {
          description: appName,
          duration: UNDO_TIMEOUT,
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                if (previousCategory) {
                  await setAppCategorySilent(appName, previousCategory);
                  toast.success(`Restored to ${previousCategory}`);
                } else {
                  toast.info("No previous category to restore");
                }
              } catch (error) {
                toast.error("Failed to restore category", {
                  description: String(error),
                });
              }
            },
          },
        });
      }
    },
    [setAppCategory, setAppCategorySilent]
  );

  return {
    isLoading,
    totalToday,
    appsToday,
    pieData,
    weeklyData,
    timelineData,
    categoryData,
    insights,
    handleCategoryChange,
    weeklyTotal: weeklyStats?.total_seconds || 0,
  };
};
