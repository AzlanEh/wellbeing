import { useState, useEffect } from "react";
import { api } from "../services/api";
import type { AutostartStatus } from "../types";

export const Settings = () => {
  const [themePath, setThemePath] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  const [autostartStatus, setAutostartStatus] = useState<AutostartStatus | null>(null);
  const [autostartLoading, setAutostartLoading] = useState(false);
  const [autostartMessage, setAutostartMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getThemePath().then(setThemePath);
    loadAutostartStatus();
  }, []);

  const loadAutostartStatus = async () => {
    try {
      const status = await api.getAutostartStatus();
      setAutostartStatus(status);
    } catch (error) {
      console.error("Failed to get autostart status:", error);
    }
  };

  const handleTestNotification = async () => {
    setNotificationStatus("Sending...");
    try {
      await api.sendTestNotification();
      setNotificationStatus("Notification sent! Check your desktop.");
    } catch (error) {
      setNotificationStatus(`Error: ${error}`);
    }
    
    // Clear status after 5 seconds
    setTimeout(() => setNotificationStatus(null), 5000);
  };

  const handleToggleAutostart = async () => {
    setAutostartLoading(true);
    setAutostartMessage(null);
    
    try {
      if (autostartStatus?.enabled) {
        const result = await api.disableAutostart();
        setAutostartMessage(result);
      } else {
        const result = await api.enableAutostart();
        setAutostartMessage(result);
      }
      await loadAutostartStatus();
    } catch (error) {
      setAutostartMessage(`Error: ${error}`);
    }
    
    setAutostartLoading(false);
    setTimeout(() => setAutostartMessage(null), 5000);
  };

  return (
    <div className="settings">
      <header className="section-header">
        <div>
          <h2>Settings</h2>
          <p className="subtitle">Customize your Digital Wellbeing experience</p>
        </div>
      </header>

      <div className="settings-sections">
        <section className="settings-section">
          <h3>Startup</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Start at Login</span>
              <span className="setting-description">
                Automatically start Digital Wellbeing when you log in to track your usage in the background
              </span>
            </div>
            <div className="setting-action">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={autostartStatus?.enabled || false}
                  onChange={handleToggleAutostart}
                  disabled={autostartLoading}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
          {autostartStatus && (
            <div className="autostart-details">
              {autostartStatus.systemd_installed && (
                <span className={`status-badge ${autostartStatus.systemd_running ? 'active' : 'inactive'}`}>
                  Systemd: {autostartStatus.systemd_running ? 'Running' : 'Stopped'}
                </span>
              )}
              {autostartStatus.xdg_installed && (
                <span className="status-badge active">XDG Autostart: Enabled</span>
              )}
            </div>
          )}
          {autostartMessage && (
            <div className={`notification-status ${autostartMessage.startsWith('Error') ? 'error' : 'success'}`}>
              {autostartMessage}
            </div>
          )}
        </section>

        <section className="settings-section">
          <h3>Notifications</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Limit Notifications</span>
              <span className="setting-description">
                Get notified when approaching (80%) or exceeding app time limits
              </span>
            </div>
            <div className="setting-action">
              <button className="btn btn-secondary" onClick={handleTestNotification}>
                Test Notification
              </button>
            </div>
          </div>
          {notificationStatus && (
            <div className={`notification-status ${notificationStatus.startsWith('Error') ? 'error' : 'success'}`}>
              {notificationStatus}
            </div>
          )}
        </section>

        <section className="settings-section">
          <h3>Theme</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Custom Theme</span>
              <span className="setting-description">
                Create your own theme by editing the theme.json file
              </span>
            </div>
            <div className="setting-value">
              <code>{themePath || "~/.config/wellbeing/theme.json"}</code>
            </div>
          </div>

          <div className="theme-example">
            <h4>Example theme.json:</h4>
            <pre>
{`{
  "colors": {
    "primary": "#4F46E5",
    "secondary": "#818CF8",
    "background": "#FFFFFF",
    "surface": "#F3F4F6",
    "text": "#1F2937",
    "textSecondary": "#6B7280",
    "accent": "#10B981",
    "warning": "#F59E0B",
    "danger": "#EF4444"
  },
  "fonts": {
    "family": "Inter, sans-serif"
  }
}`}
            </pre>
          </div>
        </section>

        <section className="settings-section">
          <h3>About</h3>
          <div className="about-info">
            <div className="about-item">
              <span className="about-label">Version</span>
              <span className="about-value">0.1.0</span>
            </div>
            <div className="about-item">
              <span className="about-label">Platform</span>
              <span className="about-value">Linux (Tauri + React)</span>
            </div>
            <div className="about-item">
              <span className="about-label">Data Location</span>
              <span className="about-value">~/.local/share/wellbeing/</span>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3>Keyboard Shortcuts</h3>
          <div className="shortcuts-list">
            <div className="shortcut-item">
              <span className="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>R</kbd>
              </span>
              <span className="shortcut-action">Refresh data</span>
            </div>
            <div className="shortcut-item">
              <span className="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>1</kbd>
              </span>
              <span className="shortcut-action">Dashboard</span>
            </div>
            <div className="shortcut-item">
              <span className="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>2</kbd>
              </span>
              <span className="shortcut-action">App Limits</span>
            </div>
            <div className="shortcut-item">
              <span className="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>3</kbd>
              </span>
              <span className="shortcut-action">Settings</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
