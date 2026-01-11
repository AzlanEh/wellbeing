import { LayoutDashboard, Clock, Settings } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { id: "limits" as const, label: "App Limits", icon: Clock },
  { id: "settings" as const, label: "Settings", icon: Settings },
];

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const Sidebar = () => {
  const { activeTab, setActiveTab, dailyStats } = useAppStore();

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-primary mb-4">Digital Wellbeing</h1>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Today
          </span>
          <span className="text-3xl font-bold text-foreground">
            {dailyStats ? formatTime(dailyStats.total_seconds) : "0m"}
          </span>
        </div>
      </div>

      <nav className="flex-1 p-4 flex flex-col gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-11",
                activeTab === tab.id && "bg-primary text-primary-foreground"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground">v0.1.0</p>
      </div>
    </aside>
  );
};
