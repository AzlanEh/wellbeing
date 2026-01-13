import { useEffect, useCallback, useRef } from "react";
import { Toaster } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import { useTheme } from "@/hooks/useTheme";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { History } from "@/components/History";
import { Goals } from "@/components/Goals";
import { FocusMode } from "@/components/FocusMode";
import { AppLimits } from "@/components/AppLimits";
import { Settings } from "@/components/Settings";
import "@/index.css";

// Refresh interval: 30 seconds when visible, pause when hidden
const REFRESH_INTERVAL = 30000;

function App() {
  const { activeTab, refreshAll, setActiveTab } = useAppStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useTheme();
  useKeyboardNav(); // Enable keyboard navigation detection

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
    <div className="flex min-h-screen bg-background">
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
      <Sidebar />
      <main
        id="main-content"
        className="flex-1 p-8 overflow-y-auto"
        tabIndex={-1}
        role="main"
        aria-label={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} view`}
      >
        {renderContent()}
      </main>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}

export default App;
