import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { formatDuration } from "@/utils/formatters";
import { Monitor, Laptop, Smartphone, Tablet } from "lucide-react";

// Colors from Tailwind theme variables
const PIE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

interface PieDataPoint {
  name: string;
  value: number;
}

interface AppBreakdownPieProps {
  data: PieDataPoint[];
}

export const AppBreakdownPie = ({ data }: AppBreakdownPieProps) => {
  const totalValue = data.reduce((acc, curr) => acc + curr.value, 0);

  // Helper for icons (simulated based on index for now as we don't have device type)
  const getIcon = (index: number) => {
    switch (index % 4) {
      case 0:
        return <Monitor className="w-4 h-4" />;
      case 1:
        return <Laptop className="w-4 h-4" />;
      case 2:
        return <Smartphone className="w-4 h-4" />;
      default:
        return <Tablet className="w-4 h-4" />;
    }
  };

  return (
    <Card className="h-full bg-card border-border shadow-sm">
      <div className="flex flex-row items-center justify-between p-6 pb-2 border-b border-border/50">
        <CardTitle className="text-lg font-semibold text-foreground">
          Apps
        </CardTitle>
        {/* Optional: Dropdown trigger */}
      </div>
      <CardContent className="p-6">
        {data.length > 0 ? (
          <div className="flex flex-col h-full">
            <div className="relative h-[200px] w-full shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="70%" // Move down for gauge look
                    startAngle={180}
                    endAngle={0}
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={0}
                    dataKey="value"
                    cornerRadius={10} // Rounded ends
                    stroke="none"
                  >
                    {data.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                        className="transition-opacity hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                      padding: "8px 12px",
                    }}
                    itemStyle={{ color: "var(--color-foreground)" }}
                    formatter={(value: number) => [
                      formatDuration(value),
                      "Time",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
                <p className="text-3xl font-bold font-display text-white">
                  {data.length}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Apps
                </p>
              </div>
            </div>

            {/* Legend List */}
            <div className="mt-4 space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[200px]">
              {data.map((entry, index) => {
                const percent =
                  totalValue > 0
                    ? ((entry.value / totalValue) * 100).toFixed(1)
                    : "0";
                const color = PIE_COLORS[index % PIE_COLORS.length];

                return (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between text-sm group"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex items-center justify-center w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                        {getIcon(index)}
                        <span className="font-medium truncate max-w-[100px]">
                          {entry.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-medium text-foreground">
                        {formatDuration(entry.value)}
                      </span>
                      <span className="text-muted-foreground w-12 text-right">
                        {percent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm flex-col gap-2">
            <div className="text-4xl opacity-20">📉</div>
            No app usage recorded today
          </div>
        )}
      </CardContent>
    </Card>
  );
};
