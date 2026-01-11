import { useEffect, useCallback } from "react";
import { useAppStore } from "./store/useAppStore";
import { useTheme } from "./hooks/useTheme";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { AppLimits } from "./components/AppLimits";
import { Settings } from "./components/Settings";
import "./App.css";

function App() {
  const { activeTab, refreshAll, setActiveTab } = useAppStore();
  useTheme();

  useEffect(() => {
    refreshAll();

    // Refresh data every 10 seconds for more real-time updates
    const interval = setInterval(refreshAll, 10000);
    return () => clearInterval(interval);
  }, [refreshAll]);

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
    <div className="app">
      <Sidebar />
      <main className="main-content">{renderContent()}</main>
    </div>
  );
}

export default App;