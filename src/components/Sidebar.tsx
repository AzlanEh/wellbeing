// Re-export specific file for Sidebar component
import {
  LayoutDashboard,
  Clock,
  Settings,
  History,
  Target,
  Focus,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const tabs = [
  {
    id: "dashboard" as const,
    label: "Dashboard",
    icon: LayoutDashboard,
    shortcut: "1",
  },
  { id: "history" as const, label: "History", icon: History, shortcut: "2" },
  { id: "goals" as const, label: "Goals", icon: Target, shortcut: "3" },
  { id: "focus" as const, label: "Focus", icon: Focus, shortcut: "4" },
  { id: "limits" as const, label: "Limits", icon: Clock, shortcut: "5" },
];

export const Sidebar = () => {
  const { activeTab, setActiveTab, sidebarCollapsed, toggleSidebar } =
    useAppStore();

  const NavItem = ({ tab }: { tab: (typeof tabs)[0]; index: number }) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;

    // In collapsed mode, we just show the icon centered.
    // In expanded mode, we show icon + label.

    if (sidebarCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center transition-all duration-300",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-5 w-5" strokeWidth={2.5} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {tab.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start gap-4 h-12 px-4 font-medium text-sm transition-all duration-300 rounded-full",
          isActive
            ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
        onClick={() => setActiveTab(tab.id)}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            isActive
              ? "text-white"
              : "text-muted-foreground group-hover:text-foreground",
          )}
          strokeWidth={2.5}
        />
        {tab.label}
      </Button>
    );
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "h-screen bg-card border-r border-border flex flex-col transition-all duration-300 py-6 overflow-hidden z-50 shadow-sm",
          sidebarCollapsed ? "w-[88px] px-3 items-center" : "w-[280px] px-6",
        )}
      >
        {/* Logo Area */}
        <div
          className={cn(
            "flex items-center mb-10 w-full",
            sidebarCollapsed ? "justify-center" : "px-2",
          )}
        >
          <div className="h-10 w-10 rounded-full bg-foreground flex items-center justify-center shrink-0 shadow-sm">
            <Activity className="h-5 w-5 text-background" strokeWidth={3} />
          </div>
          {!sidebarCollapsed && (
            <span className="ml-3 font-heading font-bold text-xl tracking-tight text-foreground">
              Wellbeing
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 w-full space-y-2">
          {tabs.map((tab, index) => (
            <NavItem key={tab.id} tab={tab} index={index} />
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="mt-auto space-y-3 w-full">
          {/* Collapse Button */}
          <Button
            variant="outline"
            className={cn(
              "rounded-full border-border hover:bg-secondary hover:text-foreground text-muted-foreground transition-all",
              sidebarCollapsed
                ? "h-12 w-12 p-0 justify-center"
                : "w-full justify-between px-4 h-12",
            )}
            onClick={toggleSidebar}
          >
            {!sidebarCollapsed && (
              <span className="font-medium text-sm">Collapse</span>
            )}
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>

          {/* Settings Link */}
          <Button
            variant="ghost"
            className={cn(
              "rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-all",
              sidebarCollapsed
                ? "h-12 w-12 p-0 justify-center"
                : "w-full justify-start gap-4 px-4 h-12",
            )}
            onClick={() => setActiveTab("settings")}
          >
            <Settings className="h-5 w-5" strokeWidth={2.5} />
            {!sidebarCollapsed && (
              <span className="font-medium text-sm">Settings</span>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
};
