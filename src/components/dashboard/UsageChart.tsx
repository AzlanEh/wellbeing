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
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDuration } from "@/utils/formatters";
import { tooltipStyle } from "./constants";

interface WeeklyDataPoint {
  name: string;
  hours: number;
}

interface TimelineDataPoint {
  hour: string;
  minutes: number;
}

interface CategoryDataPoint {
  name: string;
  value: number;
  apps: number;
  color: string;
}

interface UsageChartProps {
  weeklyData: WeeklyDataPoint[];
  timelineData: TimelineDataPoint[];
  categoryData: CategoryDataPoint[];
}

export const UsageChart = ({ weeklyData, timelineData, categoryData }: UsageChartProps) => {
  return (
    <Card className="lg:col-span-2 hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-2">
        <Tabs defaultValue="weekly" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-xl font-semibold">Usage Overview</CardTitle>
            <TabsList className="grid w-full sm:w-auto grid-cols-3">
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="category">Categories</TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="pt-6 px-0">
            <TabsContent value="weekly" className="mt-0">
              {weeklyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}h`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }}
                      formatter={(value: number) => [`${value}h`, "Screen Time"]}
                    />
                    <Bar
                      dataKey="hours"
                      fill="hsl(var(--primary))"
                      radius={[6, 6, 0, 0]}
                      barSize={40}
                      className="hover:opacity-90 transition-opacity cursor-pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm flex-col gap-2">
                  <div className="text-4xl opacity-20">📊</div>
                  No data for this week yet
                </div>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="mt-0">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis
                    dataKey="hour"
                    stroke="hsl(var(--muted-foreground))"
                    interval={3}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}m`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [`${value} min`, "Screen Time"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="minutes"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMinutes)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="category" className="mt-0">
              {categoryData.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-6 h-[250px]">
                  <ResponsiveContainer width="100%" height="100%" className="sm:w-1/2">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        cornerRadius={4}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell 
                             key={`cell-${index}`} 
                             fill={entry.color} 
                             stroke="none"
                             className="hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [
                          formatDuration(value),
                          "Time",
                        ]}
                        contentStyle={tooltipStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 w-full flex flex-col gap-3 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                    {categoryData.map((cat) => (
                      <div
                        key={cat.name}
                        className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="flex-1 font-medium truncate text-foreground">
                          {cat.name}
                        </span>
                        <span className="text-muted-foreground text-xs font-mono bg-muted px-2 py-0.5 rounded">
                          {formatDuration(cat.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm flex-col gap-2">
                  <div className="text-4xl opacity-20">📂</div>
                  No categorized usage yet. Set categories below.
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
};
