import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { StatsCards } from "./dashboard/StatsCards";
import { UsageChart } from "./dashboard/UsageChart";
import { AppBreakdownPie } from "./dashboard/AppBreakdownPie";
import { AppUsageList } from "./dashboard/AppUsageList";
import { CATEGORY_COLORS } from "./dashboard/constants";
import { LottieAnimation } from "@/components/LottieAnimation";
import catAnimation from "@/assets/animations/cat.json";

export const Dashboard = () => {
  const {
    dailyStats,
    weeklyStats,
    hourlyUsage,
    categoryUsage,
    isLoading,
    setAppCategory,
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
      date.setHours(12, 0, 0, 0); // Use noon to match backend
      
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Find matching day in stats by comparing dates
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
          hour: `${i.toString().padStart(2, "0")}:00`,
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
        <div className="hidden md:block w-16 h-16">
           <LottieAnimation animationData={catAnimation} />
        </div>
      </header>

      {/* Stats Grid */}
      <StatsCards
        totalToday={totalToday}
        appsCount={appsToday.length}
        weeklyTotal={weeklyStats?.total_seconds || 0}
      />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <UsageChart
          weeklyData={weeklyData}
          timelineData={timelineData}
          categoryData={categoryData}
        />
        <AppBreakdownPie data={pieData} />
      </div>

      {/* App List */}
      <AppUsageList
        apps={appsToday}
        totalToday={totalToday}
        onCategoryChange={setAppCategory}
      />
    </div>
  );
};
