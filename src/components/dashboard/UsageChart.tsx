import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDuration } from "@/utils/formatters";

// Theme colors from index.css (LinkGuard inspired)
const CHART_COLORS = [
  "var(--color-chart-1)", // Cyan
  "var(--color-chart-2)", // Purple
  "var(--color-chart-3)", // Yellow
];

interface TimelineDataPoint {
  hour: string;
  minutes: number;
}

interface UsageChartProps {
  timelineData: TimelineDataPoint[];
}

export const UsageChart = ({ timelineData }: UsageChartProps) => {
  // Generate dummy multi-line data for visual matching if real data is single-line
  // In a real app, you'd pass multiple data series
  const data = timelineData.map(point => ({
    ...point,
    // Simulate other metrics for the multi-line look
    previous: Math.max(0, point.minutes * (0.8 + Math.random() * 0.4)), 
    average: Math.max(0, point.minutes * (0.6 + Math.random() * 0.3)),
  }));

  return (
    <Card className="lg:col-span-3 bg-card border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
        <div>
           <CardTitle className="text-lg font-semibold text-foreground">Analytics</CardTitle>
           <div className="flex items-center gap-2 mt-1">
             <span className="text-muted-foreground text-sm">Total Usage:</span>
             <span className="text-2xl font-bold font-display text-foreground">
               {formatDuration(timelineData.reduce((acc, curr) => acc + curr.minutes, 0))}
             </span>
           </div>
        </div>
        {/* Optional: Add controls here like [Last Month] dropdown */}
      </CardHeader>

      <CardContent className="p-6">
        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                   {/* Gradient for the first line (Cyan) - matching Image 2 style */}
                  <linearGradient id="colorCyan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                
                {/* Faint Grid Lines */}
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.4} />
                
                <XAxis
                  dataKey="hour"
                  stroke="var(--color-muted-foreground)"
                  interval={3}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                  tick={{ fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}m`}
                  tick={{ fill: "var(--color-muted-foreground)" }}
                />
                
                <Tooltip
                  contentStyle={{
                      backgroundColor: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                      padding: "8px 12px",
                  }}
                  itemStyle={{ color: "var(--color-foreground)", fontSize: "12px", padding: "2px 0" }}
                  labelStyle={{ color: "var(--color-muted-foreground)", marginBottom: "4px", fontSize: "12px" }}
                  cursor={{ stroke: "var(--color-muted-foreground)", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-xs text-muted-foreground ml-1">{value}</span>}
                />

                {/* Primary Line (Cyan) - Filled */}
                <Area
                  type="monotone"
                  dataKey="minutes"
                  name="Current Usage"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCyan)"
                  activeDot={{ r: 4, strokeWidth: 0, fill: "#fff" }}
                />

                {/* Secondary Line (Purple) - Line only */}
                <Area
                  type="monotone"
                  dataKey="previous"
                  name="Previous Period"
                  stroke={CHART_COLORS[1]}
                  strokeWidth={2}
                  fill="none"
                  activeDot={false}
                  dot={false}
                />

                 {/* Tertiary Line (Yellow) - Line only */}
                 <Area
                  type="monotone"
                  dataKey="average"
                  name="Average"
                  stroke={CHART_COLORS[2]}
                  strokeWidth={2}
                  fill="none"
                  activeDot={false}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
