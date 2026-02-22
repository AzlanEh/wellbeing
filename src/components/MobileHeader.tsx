import { Menu, Activity, Bell, RefreshCw } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/utils/formatters";

export const MobileHeader = () => {
  const { 
    setMobileSidebarOpen, 
    dailyStats, 
    refreshAll,
    isLoading 
  } = useAppStore();

  return (
    <header className="sticky top-0 z-30 lg:hidden bg-card/80 backdrop-blur-md border-b border-border/50">
      <div className="flex items-center justify-between px-4 h-16">
        {/* Left: Menu button and logo */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold font-heading text-foreground">Wellbeing</span>
          </div>
        </div>
        
        {/* Right: Quick stats and actions */}
        <div className="flex items-center gap-2">
          {/* Today's time - compact */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary">
            <span className="text-xs font-medium">Today</span>
            <span className="text-sm font-bold font-mono">
              {dailyStats ? formatDuration(dailyStats.total_seconds) : "0m"}
            </span>
          </div>
          
          {/* Refresh button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => refreshAll()}
            disabled={isLoading}
            aria-label="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          
          {/* Notifications placeholder */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
