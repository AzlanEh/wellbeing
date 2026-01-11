import { useState, useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { formatDuration } from "../utils/formatters";
import { api } from "../services/api";
import type { InstalledApp } from "../types";

export const AppLimits = () => {
  const { appLimits, dailyStats, blockedApps, setAppLimit, removeAppLimit, loadBlockedApps } = useAppStore();
  const [newLimit, setNewLimit] = useState({ appName: "", minutes: 60, blockWhenExceeded: false });
  const [showAddForm, setShowAddForm] = useState(false);
  const [customAppName, setCustomAppName] = useState("");
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const trackedApps = dailyStats?.apps || [];

  // Load installed apps on mount
  useEffect(() => {
    api.getInstalledApps().then(setInstalledApps).catch(console.error);
  }, []);

  // Check for blocked apps periodically
  useEffect(() => {
    const interval = setInterval(() => {
      loadBlockedApps();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadBlockedApps]);

  // Filter installed apps based on search and existing limits
  const filteredInstalledApps = installedApps.filter(app => {
    const notLimited = !appLimits.find(l => l.app_name.toLowerCase() === app.name.toLowerCase());
    const matchesSearch = searchQuery === "" || 
      app.name.toLowerCase().includes(searchQuery.toLowerCase());
    return notLimited && matchesSearch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const appName = newLimit.appName === "__custom__" ? customAppName : newLimit.appName;
    if (appName && newLimit.minutes > 0) {
      await setAppLimit(appName, newLimit.minutes, newLimit.blockWhenExceeded);
      setNewLimit({ appName: "", minutes: 60, blockWhenExceeded: false });
      setCustomAppName("");
      setSearchQuery("");
      setShowAddForm(false);
    }
  };

  const handleRemove = async (appName: string) => {
    await removeAppLimit(appName);
  };

  const handleBlockNow = async (appName: string) => {
    try {
      await api.blockApp(appName);
      loadBlockedApps();
    } catch (error) {
      console.error("Failed to block app:", error);
    }
  };

  const getUsageForApp = (appName: string) => {
    const app = trackedApps.find((a) => a.app_name.toLowerCase() === appName.toLowerCase());
    return app?.duration_seconds || 0;
  };

  const getProgressPercentage = (appName: string, limitMinutes: number) => {
    const usage = getUsageForApp(appName);
    const limitSeconds = limitMinutes * 60;
    return Math.min((usage / limitSeconds) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "var(--color-danger)";
    if (percentage >= 80) return "var(--color-warning)";
    return "var(--color-accent)";
  };

  const isAppBlocked = (appName: string) => blockedApps.includes(appName);

  return (
    <div className="app-limits">
      <header className="section-header">
        <div>
          <h2>App Limits</h2>
          <p className="subtitle">Set daily time limits for applications</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          + Add Limit
        </button>
      </header>

      {blockedApps.length > 0 && (
        <div className="blocked-apps-banner">
          <div className="blocked-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <div className="blocked-info">
            <strong>{blockedApps.length} app{blockedApps.length > 1 ? 's' : ''} blocked</strong>
            <span>{blockedApps.join(", ")}</span>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <h3>Add App Limit</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="appSearch">Search Applications</label>
                <input
                  type="text"
                  id="appSearch"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search installed apps..."
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Select Application</label>
                <div className="app-selector">
                  {trackedApps.length > 0 && (
                    <div className="app-group">
                      <div className="app-group-label">Recently Used</div>
                      <div className="app-grid">
                        {trackedApps
                          .filter(app => 
                            !appLimits.find(l => l.app_name === app.app_name) &&
                            (searchQuery === "" || app.app_name.toLowerCase().includes(searchQuery.toLowerCase()))
                          )
                          .slice(0, 8)
                          .map((app) => (
                            <button
                              key={app.app_name}
                              type="button"
                              className={`app-option ${newLimit.appName === app.app_name ? 'selected' : ''}`}
                              onClick={() => setNewLimit({ ...newLimit, appName: app.app_name })}
                            >
                              <div className="app-option-icon">
                                {app.app_name.charAt(0).toUpperCase()}
                              </div>
                              <span className="app-option-name">{app.app_name}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="app-group">
                    <div className="app-group-label">
                      Installed Apps ({filteredInstalledApps.length})
                    </div>
                    <div className="app-grid">
                      {filteredInstalledApps.slice(0, 24).map((app) => (
                        <button
                          key={app.desktop_file}
                          type="button"
                          className={`app-option ${newLimit.appName === app.name ? 'selected' : ''}`}
                          onClick={() => setNewLimit({ ...newLimit, appName: app.name })}
                        >
                          <div className="app-option-icon">
                            {app.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="app-option-name">{app.name}</span>
                        </button>
                      ))}
                    </div>
                    {filteredInstalledApps.length > 24 && (
                      <p className="form-hint">
                        Showing 24 of {filteredInstalledApps.length} apps. Use search to find more.
                      </p>
                    )}
                  </div>

                  <div className="app-group">
                    <div className="app-group-label">Custom</div>
                    <button
                      type="button"
                      className={`app-option app-option-custom ${newLimit.appName === '__custom__' ? 'selected' : ''}`}
                      onClick={() => setNewLimit({ ...newLimit, appName: '__custom__' })}
                    >
                      <div className="app-option-icon">+</div>
                      <span className="app-option-name">Enter custom name</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {newLimit.appName === "__custom__" && (
                <div className="form-group">
                  <label htmlFor="customAppName">Custom App Name</label>
                  <input
                    type="text"
                    id="customAppName"
                    value={customAppName}
                    onChange={(e) => setCustomAppName(e.target.value)}
                    placeholder="Enter app name (e.g., Firefox, Discord)"
                    required
                  />
                </div>
              )}

              {newLimit.appName && newLimit.appName !== "__custom__" && (
                <div className="selected-app-preview">
                  Selected: <strong>{newLimit.appName}</strong>
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="minutes">Daily Limit</label>
                <div className="time-input-group">
                  <input
                    type="number"
                    id="minutes"
                    value={newLimit.minutes}
                    onChange={(e) =>
                      setNewLimit({
                        ...newLimit,
                        minutes: parseInt(e.target.value) || 0,
                      })
                    }
                    min="1"
                    max="1440"
                    required
                  />
                  <span className="time-input-suffix">minutes</span>
                  <div className="quick-time-buttons">
                    {[15, 30, 60, 120].map(m => (
                      <button
                        key={m}
                        type="button"
                        className={`quick-time-btn ${newLimit.minutes === m ? 'active' : ''}`}
                        onClick={() => setNewLimit({ ...newLimit, minutes: m })}
                      >
                        {m < 60 ? `${m}m` : `${m/60}h`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newLimit.blockWhenExceeded}
                    onChange={(e) =>
                      setNewLimit({
                        ...newLimit,
                        blockWhenExceeded: e.target.checked,
                      })
                    }
                  />
                  <span className="checkbox-text">
                    Block app when limit is exceeded
                  </span>
                </label>
                <p className="form-hint">
                  When enabled, the app will be automatically closed once the daily limit is reached.
                </p>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddForm(false);
                    setCustomAppName("");
                    setSearchQuery("");
                    setNewLimit({ appName: "", minutes: 60, blockWhenExceeded: false });
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!newLimit.appName || (newLimit.appName === "__custom__" && !customAppName)}
                >
                  Add Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="limits-list">
        {appLimits.length > 0 ? (
          appLimits.map((limit) => {
            const progress = getProgressPercentage(
              limit.app_name,
              limit.daily_limit_minutes
            );
            const usage = getUsageForApp(limit.app_name);
            const limitSeconds = limit.daily_limit_minutes * 60;
            const blocked = isAppBlocked(limit.app_name);

            return (
              <div key={limit.id} className={`limit-item ${blocked ? 'limit-blocked' : ''}`}>
                <div className="limit-header">
                  <div className="limit-app-info">
                    <div className={`limit-app-icon ${blocked ? 'blocked' : ''}`}>
                      {blocked ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                      ) : (
                        limit.app_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <span className="limit-app-name">
                        {limit.app_name}
                        {limit.block_when_exceeded && (
                          <span className="blocking-badge" title="App will be blocked when limit is exceeded">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                          </span>
                        )}
                      </span>
                      <span className="limit-details">
                        {formatDuration(usage)} / {formatDuration(limitSeconds)}
                      </span>
                    </div>
                  </div>
                  <div className="limit-actions">
                    {progress >= 100 && limit.block_when_exceeded && !blocked && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleBlockNow(limit.app_name)}
                        title="Block this app now"
                      >
                        Block Now
                      </button>
                    )}
                    <button
                      className="btn btn-icon btn-danger"
                      onClick={() => handleRemove(limit.app_name)}
                      title="Remove limit"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="limit-progress">
                  <div
                    className="limit-progress-bar"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: getProgressColor(progress),
                    }}
                  />
                </div>
                <div className="limit-status">
                  {blocked ? (
                    <span className="status-blocked">Blocked for today</span>
                  ) : progress >= 100 ? (
                    <span className="status-exceeded">
                      Limit exceeded!
                      {limit.block_when_exceeded && " App will be blocked."}
                    </span>
                  ) : progress >= 80 ? (
                    <span className="status-warning">Approaching limit</span>
                  ) : (
                    <span className="status-ok">
                      {Math.round(100 - progress)}% remaining
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
            <h3>No limits set</h3>
            <p>Set daily time limits to help manage your screen time.</p>
            <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
              Add Your First Limit
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
