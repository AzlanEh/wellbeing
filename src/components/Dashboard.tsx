import { useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import { StatsCards } from "./dashboard/StatsCards";
import { UsageChart } from "./dashboard/UsageChart";
import { AppBreakdownPie } from "./dashboard/AppBreakdownPie";
import { AppUsageList } from "./dashboard/AppUsageList";

const UNDO_TIMEOUT = 5000;

export const Dashboard = () => {
  const {
    dailyStats,
    weeklyStats,
    hourlyUsage,
    isLoading,
    setAppCategory,
    setAppCategorySilent,
  } = useAppStore();

  // Memoized computations
  const totalToday = dailyStats?.total_seconds || 0;

  const appsToday = useMemo(
    () => dailyStats?.apps.filter((a) => a.duration_seconds > 0) || [],
    [dailyStats],
  );

  const pieData = useMemo(
    () =>
      appsToday.slice(0, 8).map((app) => ({
        name: app.app_name,
        value: app.duration_seconds,
      })),
    [appsToday],
  );

  const timelineData = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const usage = hourlyUsage.find((h) => h.hour === i);
        return {
          hour: `${i.toString().padStart(2, "0")}:00`,
          minutes: usage ? Math.round(usage.total_seconds / 60) : 0,
        };
      }),
    [hourlyUsage],
  );

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
    [setAppCategory, setAppCategorySilent],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your digital activity today
          </p>
        </div>
      </header>

      {/* Stats Grid */}
      <StatsCards
        totalToday={totalToday}
        appsCount={appsToday.length}
        weeklyTotal={weeklyStats?.total_seconds || 0}
      />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <UsageChart timelineData={timelineData} />
        <div className="lg:col-span-1">
          <AppBreakdownPie data={pieData} />
        </div>
      </div>

      {/* App List */}
      <AppUsageList
        apps={appsToday}
        totalToday={totalToday}
        onCategoryChange={handleCategoryChange}
      />
    </div>
  );
};
