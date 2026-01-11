import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { useAppStore } from "../store/useAppStore";
import { formatDuration, getDayName } from "../utils/formatters";
import { APP_CATEGORIES } from "../types";

const COLORS = [
  "#4F46E5",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Productivity": "#10B981",
  "Development": "#4F46E5",
  "Communication": "#06B6D4",
  "Entertainment": "#EC4899",
  "Social Media": "#F59E0B",
  "Gaming": "#EF4444",
  "Utilities": "#6B7280",
  "Education": "#8B5CF6",
  "Other": "#9CA3AF",
  "Uncategorized": "#D1D5DB",
};

type ChartView = "weekly" | "timeline" | "category";

export const Dashboard = () => {
  const { dailyStats, weeklyStats, hourlyUsage, categoryUsage, isLoading, setAppCategory } = useAppStore();
  const [chartView, setChartView] = useState<ChartView>("weekly");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="dashboard loading">
        <div className="loader">Loading...</div>
      </div>
    );
  }

  const totalToday = dailyStats?.total_seconds || 0;
  const appsToday = dailyStats?.apps.filter((a) => a.duration_seconds > 0) || [];

  const pieData = appsToday.slice(0, 8).map((app) => ({
    name: app.app_name,
    value: app.duration_seconds,
  }));

  const weeklyData =
    weeklyStats?.days.map((day) => ({
      name: getDayName(day.date),
      hours: Math.round((day.total_seconds / 3600) * 10) / 10,
    })) || [];

  // Prepare timeline data (24 hours)
  const timelineData = Array.from({ length: 24 }, (_, i) => {
    const usage = hourlyUsage.find((h) => h.hour === i);
    return {
      hour: `${i.toString().padStart(2, "0")}:00`,
      minutes: usage ? Math.round(usage.total_seconds / 60) : 0,
    };
  });

  // Prepare category data
  const categoryData = categoryUsage.map((cat) => ({
    name: cat.category,
    value: cat.total_seconds,
    apps: cat.app_count,
    color: CATEGORY_COLORS[cat.category] || CATEGORY_COLORS["Other"],
  }));

  const handleCategoryChange = async (appName: string, category: string) => {
    await setAppCategory(appName, category);
    setEditingCategory(null);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2>Screen Time Dashboard</h2>
        <p className="subtitle">Track your daily app usage</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card total-time">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Today</span>
            <span className="stat-value">{formatDuration(totalToday)}</span>
          </div>
        </div>

        <div className="stat-card apps-used">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Apps Used</span>
            <span className="stat-value">{appsToday.length}</span>
          </div>
        </div>

        <div className="stat-card week-total">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">This Week</span>
            <span className="stat-value">
              {formatDuration(weeklyStats?.total_seconds || 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card chart-card-wide">
          <div className="chart-header">
            <h3>Usage Overview</h3>
            <div className="chart-tabs">
              <button
                className={`chart-tab ${chartView === "weekly" ? "active" : ""}`}
                onClick={() => setChartView("weekly")}
              >
                Weekly
              </button>
              <button
                className={`chart-tab ${chartView === "timeline" ? "active" : ""}`}
                onClick={() => setChartView("timeline")}
              >
                Timeline
              </button>
              <button
                className={`chart-tab ${chartView === "category" ? "active" : ""}`}
                onClick={() => setChartView("category")}
              >
                Categories
              </button>
            </div>
          </div>

          {chartView === "weekly" && (
            weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData}>
                  <XAxis dataKey="name" stroke="var(--color-text-secondary)" />
                  <YAxis stroke="var(--color-text-secondary)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-surface)",
                      border: "none",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value}h`, "Screen Time"]}
                  />
                  <Bar dataKey="hours" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No data for this week yet</div>
            )
          )}

          {chartView === "timeline" && (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timelineData}>
                <XAxis 
                  dataKey="hour" 
                  stroke="var(--color-text-secondary)"
                  interval={2}
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  stroke="var(--color-text-secondary)"
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "none",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value} min`, "Screen Time"]}
                />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  stroke="var(--color-primary)"
                  fill="var(--color-primary)"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {chartView === "category" && (
            categoryData.length > 0 ? (
              <div className="category-chart-container">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatDuration(value), "Time"]}
                      contentStyle={{
                        background: "var(--color-surface)",
                        border: "none",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="category-legend">
                  {categoryData.map((cat) => (
                    <div key={cat.name} className="category-legend-item">
                      <span 
                        className="category-dot" 
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="category-name">{cat.name}</span>
                      <span className="category-time">{formatDuration(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="no-data">No categorized usage yet. Set categories below.</div>
            )
          )}
        </div>

        <div className="chart-card">
          <h3>App Breakdown</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [formatDuration(value), "Time"]}
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "none",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No app usage recorded today</div>
          )}
        </div>
      </div>

      <div className="app-list-section">
        <h3>App Usage Today</h3>
        <div className="app-list">
          {appsToday.length > 0 ? (
            appsToday.map((app, index) => (
              <div key={app.app_name} className="app-item">
                <div
                  className="app-icon"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                >
                  {app.app_name.charAt(0).toUpperCase()}
                </div>
                <div className="app-info">
                  <span className="app-name">{app.app_name}</span>
                  <div className="app-meta">
                    <span className="app-sessions">{app.session_count} sessions</span>
                    {editingCategory === app.app_name ? (
                      <select
                        className="category-select"
                        value={app.category || ""}
                        onChange={(e) => handleCategoryChange(app.app_name, e.target.value)}
                        onBlur={() => setEditingCategory(null)}
                        autoFocus
                      >
                        <option value="">Select category...</option>
                        {APP_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        className="category-badge"
                        onClick={() => setEditingCategory(app.app_name)}
                        style={{
                          backgroundColor: app.category 
                            ? CATEGORY_COLORS[app.category] + "20"
                            : "var(--color-surface)",
                          color: app.category
                            ? CATEGORY_COLORS[app.category]
                            : "var(--color-text-secondary)",
                        }}
                      >
                        {app.category || "Set category"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="app-usage">
                  <div
                    className="usage-bar"
                    style={{
                      width: `${Math.min((app.duration_seconds / totalToday) * 100, 100)}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                  <span className="usage-time">{formatDuration(app.duration_seconds)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-data">No apps tracked yet. Start using your computer!</div>
          )}
        </div>
      </div>
    </div>
  );
};
