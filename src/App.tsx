import { useEffect, useCallback, useRef } from "react";
import { Toaster } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import { useTheme } from "@/hooks/useTheme";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { AppLimits } from "@/components/AppLimits";
import { Settings } from "@/components/Settings";
import "@/index.css";

// Refresh interval: 30 seconds when visible, pause when hidden
const REFRESH_INTERVAL = 30000;

function App() {
  const { activeTab, refreshAll, setActiveTab } = useAppStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useTheme();

  // Start/stop polling based on visibility
  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // Already polling
    intervalRef.current = setInterval(refreshAll, REFRESH_INTERVAL);
  }, [refreshAll]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    refreshAll();

    // Start polling
    startPolling();

    // Handle visibility changes - pause polling when tab/window is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Refresh immediately when becoming visible, then resume polling
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
            setActiveTab("limits");
            break;
          case "3":
            e.preventDefault();
            setActiveTab("settings");
            break;
        }
      }
    },
    [refreshAll, setActiveTab]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "limits":
        return <AppLimits />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">{renderContent()}</main>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}

export default App;
