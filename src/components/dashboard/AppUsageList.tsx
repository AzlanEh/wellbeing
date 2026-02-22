import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/utils/formatters";
import { APP_CATEGORIES, AppUsage } from "@/types";
import { COLORS, CATEGORY_COLORS } from "./constants";
import { Progress } from "@/components/ui/progress";
import { Monitor, MoreHorizontal } from "lucide-react";

interface AppUsageListProps {
  apps: AppUsage[];
  totalToday: number;
  onCategoryChange: (appName: string, category: string) => Promise<void>;
}

export const AppUsageList = ({ apps, totalToday, onCategoryChange }: AppUsageListProps) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  const handleCategoryChange = async (appName: string, category: string) => {
    await onCategoryChange(appName, category);
    setEditingCategory(null);
  };

  return (
    <Card className="bg-card border-none shadow-md hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-medium tracking-tight">Top Applications</CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
             <span>Last 24 Hours</span>
             <MoreHorizontal className="w-4 h-4 cursor-pointer hover:text-foreground transition-colors" />
          </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-6 sm:col-span-5">Application</div>
                <div className="col-span-3 sm:col-span-4 text-right">Usage</div>
                <div className="col-span-3 text-right">Share</div>
            </div>

          {apps.length > 0 ? (
            apps.map((app, index) => {
              const percentage = Math.min((app.duration_seconds / totalToday) * 100, 100);
              const bgColor = COLORS[index % COLORS.length];
              
              return (
                <div
                  key={app.app_name}
                  className={cn(
                    "group grid grid-cols-12 gap-4 items-center p-3 rounded-xl",
                    "hover:bg-secondary/40 transition-colors cursor-pointer"
                  )}
                >
                  {/* App Name & Icon */}
                  <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0">
                    <div
                        className="relative h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm shrink-0 transition-transform group-hover:scale-105"
                        style={{ 
                        background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 100%)`
                        }}
                    >
                        <span className="text-sm">{app.app_name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0 flex flex-col items-start gap-1">
                         <span className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">{app.app_name}</span>
                         
                         {editingCategory === app.app_name ? (
                            <div onClick={(e) => e.stopPropagation()}>
                                <Select
                                value={app.category || ""}
                                onValueChange={(value) =>
                                    handleCategoryChange(app.app_name, value)
                                }
                                onOpenChange={(open) => !open && setEditingCategory(null)}
                                >
                                <SelectTrigger className="h-6 w-28 text-[10px] px-2 rounded-md border-none bg-background shadow-sm">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {APP_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat} className="rounded-lg text-xs">
                                        <div className="flex items-center gap-2">
                                        <span 
                                            className="w-1.5 h-1.5 rounded-full"
                                            style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                                        />
                                        {cat}
                                        </div>
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                            </div>
                        ) : (
                             <span 
                                className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-md bg-secondary/50 border border-transparent hover:border-border transition-colors cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCategory(app.app_name);
                                }}
                             >
                                {app.category || "Uncategorized"}
                             </span>
                        )}
                    </div>
                  </div>

                  {/* Usage Duration */}
                  <div className="col-span-3 sm:col-span-4 text-right">
                      <span className="text-sm font-medium font-mono text-foreground">
                        {formatDuration(app.duration_seconds)}
                      </span>
                  </div>

                  {/* Percentage & Progress */}
                  <div className="col-span-3 flex items-center justify-end gap-3">
                      <div className="w-16 hidden sm:block">
                        <Progress value={percentage} className="h-1.5 bg-secondary" color={bgColor} />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground w-12 text-right">{percentage.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <div className="h-20 w-20 mx-auto rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
                <Monitor className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium mb-1">No apps tracked yet</p>
              <p className="text-sm text-muted-foreground/70">Start using your computer to see data here!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
