import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/utils/formatters";
import { APP_CATEGORIES, AppUsage } from "@/types";
import { COLORS, CATEGORY_COLORS } from "./constants";
import { Progress } from "@/components/ui/progress";

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
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">App Usage Today</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {apps.length > 0 ? (
            apps.map((app, index) => (
              <div
                key={app.app_name}
                className="flex items-center gap-4 p-4 rounded-xl bg-card hover:bg-accent/5 border border-border/50 transition-colors"
              >
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                >
                  {app.app_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                     <div className="font-semibold truncate text-lg">{app.app_name}</div>
                     <span className="text-sm font-bold min-w-[60px] text-right text-primary">
                        {formatDuration(app.duration_seconds)}
                     </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
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
                        variant="secondary"
                        className={cn(
                          "cursor-pointer text-xs font-normal hover:bg-secondary/80",
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
                  
                  <Progress 
                     value={Math.min((app.duration_seconds / totalToday) * 100, 100)} 
                     className="h-2"
                     color={COLORS[index % COLORS.length]}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
               <p className="text-lg font-medium">No apps tracked yet</p>
               <p className="text-sm">Start using your computer to see data here!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
