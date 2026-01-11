import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Clock, LayoutGrid, Calendar } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { formatDuration, getDayName } from "@/utils/formatters";
import { APP_CATEGORIES } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const COLORS = [
  "#4F46E5",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

const CATEGORY_COLORS: Record<string, string> = {
  Productivity: "#10B981",
  Development: "#4F46E5",
  Communication: "#06B6D4",
  Entertainment: "#EC4899",
  "Social Media": "#F59E0B",
  Gaming: "#EF4444",
  Utilities: "#6B7280",
  Education: "#8B5CF6",
  Other: "#9CA3AF",
  Uncategorized: "#D1D5DB",
};

export const Dashboard = () => {
  const {
    dailyStats,
    weeklyStats,
    hourlyUsage,
    categoryUsage,
    isLoading,
    setAppCategory,
  } = useAppStore();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const totalToday = dailyStats?.total_seconds || 0;
  const appsToday = dailyStats?.apps.filter((a) => a.duration_seconds > 0) || [];

  const pieData = appsToday.slice(0, 8).map((app) => ({
    name: app.app_name,
    value: app.duration_seconds,
  }));

  const weeklyData =
    weeklyStats?.days.map((day) => ({
      name: getDayName(day.date),
      hours: Math.round((day.total_seconds / 3600) * 10) / 10,
    })) || [];

  const timelineData = Array.from({ length: 24 }, (_, i) => {
    const usage = hourlyUsage.find((h) => h.hour === i);
    return {
      hour: `${i.toString().padStart(2, "0")}:00`,
      minutes: usage ? Math.round(usage.total_seconds / 60) : 0,
    };
  });

  const categoryData = categoryUsage.map((cat) => ({
    name: cat.category,
    value: cat.total_seconds,
    apps: cat.app_count,
    color: CATEGORY_COLORS[cat.category] || CATEGORY_COLORS["Other"],
  }));

  const handleCategoryChange = async (appName: string, category: string) => {
    await setAppCategory(appName, category);
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Screen Time Dashboard</h2>
        <p className="text-muted-foreground text-sm">
          Track your daily app usage
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Total Today
              </p>
              <p className="text-2xl font-bold">{formatDuration(totalToday)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <LayoutGrid className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Apps Used
              </p>
              <p className="text-2xl font-bold">{appsToday.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                This Week
              </p>
              <p className="text-2xl font-bold">
                {formatDuration(weeklyStats?.total_seconds || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <Tabs defaultValue="weekly" className="w-full">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Usage Overview</CardTitle>
                <TabsList>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="category">Categories</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="weekly" className="mt-4">
                {weeklyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={weeklyData}>
                      <XAxis
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [`${value}h`, "Screen Time"]}
                      />
                      <Bar
                        dataKey="hours"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                    No data for this week yet
                  </div>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="mt-4">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={timelineData}>
                    <XAxis
                      dataKey="hour"
                      stroke="hsl(var(--muted-foreground))"
                      interval={2}
                      fontSize={11}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`${value} min`, "Screen Time"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="minutes"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="category" className="mt-4">
                {categoryData.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [
                            formatDuration(value),
                            "Time",
                          ]}
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 flex flex-col gap-2">
                      {categoryData.map((cat) => (
                        <div
                          key={cat.name}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="flex-1 text-foreground">
                            {cat.name}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {formatDuration(cat.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                    No categorized usage yet. Set categories below.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">App Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatDuration(value), "Time"]}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No app usage recorded today
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* App List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">App Usage Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {appsToday.length > 0 ? (
              appsToday.map((app, index) => (
                <div
                  key={app.app_name}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                >
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  >
                    {app.app_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{app.app_name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {app.session_count} sessions
                      </span>
                      {editingCategory === app.app_name ? (
                        <Select
                          value={app.category || ""}
                          onValueChange={(value) =>
                            handleCategoryChange(app.app_name, value)
                          }
                        >
                          <SelectTrigger className="h-6 w-32 text-xs">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {APP_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn(
                            "cursor-pointer text-xs",
                            app.category && "border-transparent"
                          )}
                          style={
                            app.category
                              ? {
                                  backgroundColor:
                                    CATEGORY_COLORS[app.category] + "20",
                                  color: CATEGORY_COLORS[app.category],
                                }
                              : undefined
                          }
                          onClick={() => setEditingCategory(app.app_name)}
                        >
                          {app.category || "Set category"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-1.5 rounded-full min-w-[40px]"
                      style={{
                        width: `${Math.min((app.duration_seconds / totalToday) * 100, 100)}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                        maxWidth: "100px",
                      }}
                    />
                    <span className="text-sm font-medium min-w-[60px] text-right">
                      {formatDuration(app.duration_seconds)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No apps tracked yet. Start using your computer!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
