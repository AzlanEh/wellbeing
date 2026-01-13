import { LayoutDashboard, Clock, Settings, Minus, History, Activity, Target, Focus } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { formatDuration } from "@/utils/formatters";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const tabs = [
  { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { id: "history" as const, label: "History", icon: History },
  { id: "goals" as const, label: "Goals", icon: Target },
  { id: "focus" as const, label: "Focus Mode", icon: Focus },
  { id: "limits" as const, label: "App Limits", icon: Clock },
  { id: "settings" as const, label: "Settings", icon: Settings },
];

export const Sidebar = () => {
  const { activeTab, setActiveTab, dailyStats } = useAppStore();

  const handleMinimizeToTray = async () => {
    try {
      await api.minimizeToTray();
    } catch (error) {
      console.error("Failed to minimize to tray:", error);
    }
  };

  return (
    <aside 
      className="w-64 bg-card border-r flex flex-col shadow-lg z-10"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shadow-md">
                <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Wellbeing</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleMinimizeToTray}
            title="Minimize to tray"
            aria-label="Minimize to system tray"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Today's Activity
            </span>
          </div>
          <div 
            className="text-3xl font-bold text-foreground tracking-tight"
            aria-label={`Today's screen time: ${dailyStats ? formatDuration(dailyStats.total_seconds) : "0 minutes"}`}
          >
            {dailyStats ? formatDuration(dailyStats.total_seconds) : "0m"}
          </div>
        </div>
      </div>

      <div className="px-4">
        <Separator className="bg-border/50" />
      </div>

      <nav className="flex-1 p-4 flex flex-col gap-2" aria-label="Main menu">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-11 font-medium transition-all duration-200",
                isActive 
                    ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              onClick={() => setActiveTab(tab.id)}
              aria-current={isActive ? "page" : undefined}
              aria-label={`${tab.label} (Ctrl+${index + 1})`}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
              <span>{tab.label}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Button>
          );
        })}
      </nav>

      <div className="p-4 border-t bg-muted/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>v0.1.0</span>
            <span>Local Mode</span>
        </div>
      </div>
    </aside>
  );
};
