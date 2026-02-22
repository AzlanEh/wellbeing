import { useEffect, useCallback, useRef } from "react";
import { Toaster } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import { useTheme } from "@/hooks/useTheme";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { History } from "@/components/History";
import { Goals } from "@/components/Goals";
import { FocusMode } from "@/components/FocusMode";
import { AppLimits } from "@/components/AppLimits";
import { Settings } from "@/components/Settings";
import { MobileHeader } from "@/components/MobileHeader";
import { cn } from "@/lib/utils";
import "@/index.css";

// Refresh interval: 30 seconds when visible, pause when hidden
const REFRESH_INTERVAL = 30000;

function App() {
  const { 
    activeTab, 
    refreshAll, 
    setActiveTab, 
    sidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen 
  } = useAppStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useTheme();
  useDarkMode();
  useKeyboardNav();

  // Start/stop polling based on visibility
  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(refreshAll, REFRESH_INTERVAL);
  }, [refreshAll]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    refreshAll();
    startPolling();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        refreshAll();
        startPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshAll, startPolling, stopPolling]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "r":
            e.preventDefault();
            refreshAll();
            break;
          case "1":
            e.preventDefault();
            setActiveTab("dashboard");
            break;
          case "2":
            e.preventDefault();
            setActiveTab("history");
            break;
          case "3":
            e.preventDefault();
            setActiveTab("goals");
            break;
          case "4":
            e.preventDefault();
            setActiveTab("focus");
            break;
          case "5":
            e.preventDefault();
            setActiveTab("limits");
            break;
          case "6":
            e.preventDefault();
            setActiveTab("settings");
            break;
          case "b":
            e.preventDefault();
            useAppStore.getState().toggleSidebar();
            break;
        }
      }
      // Escape to close mobile sidebar
      if (e.key === "Escape" && mobileSidebarOpen) {
        setMobileSidebarOpen(false);
      }
    },
    [refreshAll, setActiveTab, mobileSidebarOpen, setMobileSidebarOpen]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [activeTab, setMobileSidebarOpen]);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "history":
        return <History />;
      case "goals":
        return <Goals />;
      case "focus":
        return <FocusMode />;
      case "limits":
        return <AppLimits />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Skip navigation link for keyboard users */}
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to main content
      </a>
      
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - Fixed position, hidden on mobile */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50",
        "transform transition-transform duration-300 ease-in-out",
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <Sidebar />
      </div>
      
      {/* Main content area - offset by sidebar width */}
      <div className={cn(
        "flex-1 flex flex-col h-screen transition-all duration-300",
        sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-72"
      )}>
        {/* Mobile header */}
        <MobileHeader />
        
        {/* Main content - scrollable */}
        <main
          id="main-content"
          className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto"
          tabIndex={-1}
          role="main"
          aria-label={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} view`}
        >
          <div className="max-w-7xl mx-auto pb-8">
            {renderContent()}
          </div>
        </main>
      </div>
      
      <Toaster 
        position="bottom-right" 
        richColors 
        closeButton 
        toastOptions={{
          className: "rounded-xl shadow-lg border-border/50",
        }}
      />
    </div>
  );
}

export default App;
