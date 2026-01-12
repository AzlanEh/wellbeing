import { Clock, LayoutGrid, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/utils/formatters";

interface StatsCardsProps {
  totalToday: number;
  appsCount: number;
  weeklyTotal: number;
}

export const StatsCards = ({ totalToday, appsCount, weeklyTotal }: StatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/80">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Today</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatDuration(totalToday)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Active screen time
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-secondary/80">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className="text-sm font-medium">Apps Used</CardTitle>
           <LayoutGrid className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{appsCount}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Different applications
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-accent/80">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Week</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatDuration(weeklyTotal)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Total usage since Monday
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
