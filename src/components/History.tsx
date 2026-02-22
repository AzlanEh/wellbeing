import { useState, useEffect, useMemo } from "react";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Calendar, TrendingUp, TrendingDown, Minus, RefreshCw, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { api } from "@/services/api";
import type { HistoricalData, DayStats, AppUsage, CategoryUsage } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDuration } from "@/utils/formatters";
import { CATEGORY_COLORS } from "./dashboard/constants";
import { cn } from "@/lib/utils";

type PresetRange = "7d" | "14d" | "30d" | "90d" | "custom";

interface ComparisonData {
  current: HistoricalData | null;
  previous: HistoricalData | null;
}

export const History = () => {
  const [presetRange, setPresetRange] = useState<PresetRange>("30d");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ComparisonData>({ current: null, previous: null });

  const presets: { value: PresetRange; label: string; days: number }[] = [
    { value: "7d", label: "7 Days", days: 7 },
    { value: "14d", label: "14 Days", days: 14 },
    { value: "30d", label: "30 Days", days: 30 },
    { value: "90d", label: "90 Days", days: 90 },
  ];

  const applyPreset = (preset: PresetRange) => {
    if (preset === "custom") {
      setPresetRange("custom");
      return;
    }

    const presetConfig = presets.find((p) => p.value === preset);
    if (!presetConfig) return;

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - presetConfig.days);

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
    setPresetRange(preset);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Calculate the period length in days
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime();
      const periodDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;

      // Calculate previous period dates
      const prevEnd = new Date(startMs - 1000 * 60 * 60 * 24); // Day before start
      const prevStart = new Date(prevEnd.getTime() - (periodDays - 1) * 24 * 60 * 60 * 1000);

      // Fetch both periods in parallel
      const [currentData, previousData] = await Promise.all([
        api.getHistoricalData(startDate, endDate),
        api.getHistoricalData(
          prevStart.toISOString().split("T")[0],
          prevEnd.toISOString().split("T")[0]
        ),
      ]);

      setData({ current: currentData, previous: previousData });
    } catch (err) {
      setError(String(err));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  // Transform daily totals for the trend chart
  const trendChartData = useMemo(() => {
    if (!data.current?.daily_totals) return [];

    return data.current.daily_totals.map((day: DayStats) => ({
      date: day.date,
      displayDate: new Date(day.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      hours: Math.round((day.total_seconds / 3600) * 10) / 10,
      seconds: day.total_seconds,
    }));
  }, [data.current]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!data.current) {
      return {
        totalTime: 0,
        avgDaily: 0,
        peakDay: null as DayStats | null,
        change: 0,
      };
    }

    const totalTime = data.current.total_seconds;
    const daysWithData = data.current.daily_totals.length || 1;
    const avgDaily = totalTime / daysWithData;
    const peakDay = data.current.daily_totals.reduce(
      (max, day) => (day.total_seconds > (max?.total_seconds || 0) ? day : max),
      data.current.daily_totals[0]
    );

    // Calculate change from previous period
    const prevTotal = data.previous?.total_seconds || 0;
    const change = prevTotal > 0 ? ((totalTime - prevTotal) / prevTotal) * 100 : 0;

    return { totalTime, avgDaily, peakDay, change };
  }, [data]);

  // Transform app usage for bar chart (top 10)
  const appChartData = useMemo(() => {
    if (!data.current?.app_usage) return [];

    return data.current.app_usage.slice(0, 10).map((app: AppUsage) => ({
      name: app.app_name.length > 12 ? app.app_name.slice(0, 12) + "..." : app.app_name,
      fullName: app.app_name,
      hours: Math.round((app.duration_seconds / 3600) * 10) / 10,
      seconds: app.duration_seconds,
      category: app.category || "Uncategorized",
    }));
  }, [data.current]);

  // Transform category usage for pie chart
  const categoryChartData = useMemo(() => {
    if (!data.current?.category_usage) return [];

    return data.current.category_usage.map((cat: CategoryUsage) => ({
      name: cat.category,
      value: cat.total_seconds,
      apps: cat.app_count,
      color: CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.Uncategorized,
    }));
  }, [data.current]);

  const TrendIcon = stats.change > 0 ? TrendingUp : stats.change < 0 ? TrendingDown : Minus;
  const trendColor =
    stats.change > 5 ? "text-red-500" : stats.change < -5 ? "text-green-500" : "text-muted-foreground";

  return (
    <div className="space-y-6 max-w-7xl animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">History</h2>
          <p className="text-muted-foreground mt-2">
            Analyze your digital habits over time
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2 self-start md:self-auto hover:bg-primary/10 hover:text-primary transition-colors">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh Data
        </Button>
      </header>

      {/* Date Range Selector */}
      <Card className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Select Date Range
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.value}
                variant={presetRange === preset.value ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset(preset.value)}
                className="transition-all"
              >
                {preset.label}
              </Button>
            ))}
            <Button
              variant={presetRange === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setPresetRange("custom")}
              className="transition-all"
            >
              Custom Range
            </Button>
          </div>

          {presetRange === "custom" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <Label htmlFor="history-start">Start Date</Label>
                <Input
                  id="history-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="history-end">End Date</Label>
                <Input
                  id="history-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm border border-destructive/20">{error}</div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow hover:border-primary/50">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground font-medium">Total Screen Time</div>
            <div className="text-2xl font-bold mt-2 text-primary">{formatDuration(stats.totalTime)}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow hover:border-primary/50">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground font-medium">Daily Average</div>
            <div className="text-2xl font-bold mt-2">{formatDuration(stats.avgDaily)}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow hover:border-primary/50">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground font-medium">Peak Day</div>
            <div className="text-2xl font-bold mt-2">
              {stats.peakDay ? formatDuration(stats.peakDay.total_seconds) : "--"}
            </div>
            {stats.peakDay && (
              <div className="text-xs text-muted-foreground mt-1 font-medium bg-muted px-2 py-0.5 rounded w-fit">
                {new Date(stats.peakDay.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow hover:border-primary/50">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground font-medium">vs Previous Period</div>
            <div className={cn("text-2xl font-bold mt-2 flex items-center gap-2", trendColor)}>
              <TrendIcon className="h-5 w-5" />
              {Math.abs(stats.change).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.change > 0 ? "Increase" : stats.change < 0 ? "Decrease" : "No significant change"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="trend" className="space-y-6">
        <div className="flex items-center justify-between">
            <TabsList className="bg-muted/50 p-1">
                <TabsTrigger value="trend" className="gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Trend
                </TabsTrigger>
                <TabsTrigger value="breakdown" className="gap-2">
                    <PieChartIcon className="h-4 w-4" />
                    Breakdown
                </TabsTrigger>
                <TabsTrigger value="comparison" className="gap-2" disabled={!data.previous}>
                    <BarChart3 className="h-4 w-4" />
                    Comparison
                </TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="trend" className="mt-0">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Daily Usage Trend</CardTitle>
              <CardDescription>Screen time distribution over the selected period</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
              {trendChartData.length > 0 ? (
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="displayDate"
                        stroke="var(--color-muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                      />
                      <YAxis
                        stroke="var(--color-muted-foreground)"
                        fontSize={11}
                        tickFormatter={(value) => `${value}h`}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--color-popover)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                          padding: "8px 12px",
                        }}
                        cursor={{ stroke: "var(--color-muted-foreground)", strokeWidth: 1, strokeDasharray: "4 4" }}
                        formatter={(value: number, _name: string, props: { payload?: { seconds?: number } }) => [
                          formatDuration(props.payload?.seconds || value * 3600),
                          "Screen Time",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="hours"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorHours)"
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground text-sm bg-muted/10 rounded-lg m-4 border border-dashed">
                  <TrendingUp className="h-8 w-8 mb-2 opacity-50" />
                  {loading ? "Loading..." : "No data available for the selected period"}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="mt-0">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top Apps */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Top Apps</CardTitle>
                <CardDescription>Most used applications by duration</CardDescription>
              </CardHeader>
              <CardContent>
                {appChartData.length > 0 ? (
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={appChartData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                        <XAxis
                          type="number"
                          stroke="var(--color-muted-foreground)"
                          fontSize={11}
                          tickFormatter={(value) => `${value}h`}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke="var(--color-muted-foreground)"
                          fontSize={11}
                          width={100}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--color-popover)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                            padding: "8px 12px",
                          }}
                          cursor={{ fill: "var(--color-muted)" }}
                          formatter={(value: number, _name: string, props: { payload?: { seconds?: number; fullName?: string } }) => [
                            formatDuration(props.payload?.seconds || value * 3600),
                            props.payload?.fullName || "Time",
                          ]}
                        />
                        <Bar 
                           dataKey="hours" 
                           fill="var(--color-primary)" 
                           radius={[0, 4, 4, 0] as [number, number, number, number]} 
                           barSize={20}
                           background={{ fill: "var(--color-muted)", radius: 4 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground text-sm bg-muted/10 rounded-lg border border-dashed">
                    <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
                    {loading ? "Loading..." : "No app data available"}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
                <CardDescription>Usage distribution by category</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryChartData.length > 0 ? (
                  <div className="flex flex-col sm:flex-row items-center gap-6 h-[350px]">
                    <div className="w-full sm:w-1/2 h-full min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                            data={categoryChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={2}
                            dataKey="value"
                            strokeWidth={0}
                            >
                            {categoryChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            </Pie>
                            <Tooltip
                            formatter={(value: number) => [formatDuration(value), "Time"]}
                            contentStyle={{
                              backgroundColor: "var(--color-popover)",
                              border: "1px solid var(--color-border)",
                              borderRadius: "var(--radius)",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                              padding: "8px 12px",
                            }}
                            />
                        </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="w-full sm:w-1/2 flex flex-col justify-center gap-3 overflow-y-auto max-h-[300px] pr-2">
                      {categoryChartData.map((cat) => (
                        <div key={cat.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: cat.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{cat.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {cat.apps} app{cat.apps !== 1 ? "s" : ""}
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0 font-normal">
                            {formatDuration(cat.value)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground text-sm bg-muted/10 rounded-lg border border-dashed">
                    <PieChartIcon className="h-8 w-8 mb-2 opacity-50" />
                    {loading ? "Loading..." : "No category data available"}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="mt-0">
            {data.previous && data.current && data.previous.app_usage.length > 0 ? (
                <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                    <CardTitle className="text-lg">Comparison with Previous Period</CardTitle>
                    <CardDescription>
                        Comparing {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()} vs previous {presets.find(p => p.value === presetRange)?.days || 'custom'} days
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-6 bg-muted/30 rounded-xl border border-border/50">
                        <div className="text-sm text-muted-foreground mb-2 font-medium uppercase tracking-wider">Previous Period</div>
                        <div className="text-3xl font-bold tracking-tight">
                            {formatDuration(data.previous.total_seconds)}
                        </div>
                        </div>
                        <div className="p-6 bg-primary/5 rounded-xl border border-primary/20">
                        <div className="text-sm text-primary/80 mb-2 font-medium uppercase tracking-wider">Current Period</div>
                        <div className="text-3xl font-bold text-primary tracking-tight">
                            {formatDuration(data.current.total_seconds)}
                        </div>
                        </div>
                    </div>

                    <div className="border-t pt-6">
                        <div className="text-sm font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Top App Changes
                        </div>
                        <div className="space-y-3">
                        {data.current.app_usage.slice(0, 5).map((app) => {
                            const prevApp = data.previous?.app_usage.find(
                            (p) => p.app_name === app.app_name
                            );
                            const prevSeconds = prevApp?.duration_seconds || 0;
                            const change = prevSeconds > 0
                            ? ((app.duration_seconds - prevSeconds) / prevSeconds) * 100
                            : app.duration_seconds > 0 ? 100 : 0;
                            const changeColor =
                            change > 10 ? "text-red-500" : change < -10 ? "text-green-500" : "text-muted-foreground";

                            return (
                            <div
                                key={app.app_name}
                                className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                            >
                                <span className="truncate flex-1 font-medium">{app.app_name}</span>
                                <div className="flex items-center gap-6">
                                <span className="text-muted-foreground font-mono text-xs">
                                    {formatDuration(app.duration_seconds)}
                                </span>
                                <Badge variant="secondary" className={cn("w-20 justify-center", changeColor)}>
                                    {change > 0 ? "+" : ""}
                                    {change.toFixed(0)}%
                                </Badge>
                                </div>
                            </div>
                            );
                        })}
                        </div>
                    </div>
                    </div>
                </CardContent>
                </Card>
            ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground text-sm bg-muted/10 rounded-lg border border-dashed">
                    <p>No comparison data available for this range.</p>
                </div>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
