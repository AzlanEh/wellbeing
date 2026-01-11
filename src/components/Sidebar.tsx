import { useAppStore } from "../store/useAppStore";

export const Sidebar = () => {
  const { activeTab, setActiveTab, dailyStats } = useAppStore();

  const tabs = [
    { id: "dashboard" as const, label: "Dashboard", icon: "chart" },
    { id: "limits" as const, label: "App Limits", icon: "clock" },
    { id: "settings" as const, label: "Settings", icon: "settings" },
  ];

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="app-title">Digital Wellbeing</h1>
        <div className="today-summary">
          <span className="summary-label">Today</span>
          <span className="summary-time">
            {dailyStats ? formatTime(dailyStats.total_seconds) : "0m"}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className={`nav-icon icon-${tab.icon}`}></span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p className="version">v0.1.0</p>
      </div>
    </aside>
  );
};