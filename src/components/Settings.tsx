import { useState, useEffect } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { api } from "@/services/api";
import { useDarkMode } from "@/hooks/useDarkMode";
import type { AutostartStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Settings = () => {
  const [themePath, setThemePath] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  const [autostartStatus, setAutostartStatus] = useState<AutostartStatus | null>(null);
  const [autostartLoading, setAutostartLoading] = useState(false);
  const [autostartMessage, setAutostartMessage] = useState<string | null>(null);
  const { theme, setTheme } = useDarkMode();

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

  const shortcuts = [
    { keys: ["Ctrl", "R"], action: "Refresh data" },
    { keys: ["Ctrl", "1"], action: "Dashboard" },
    { keys: ["Ctrl", "2"], action: "App Limits" },
    { keys: ["Ctrl", "3"], action: "Settings" },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground text-sm">
          Customize your Digital Wellbeing experience
        </p>
      </header>

      <div className="space-y-6">
        {/* Startup Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Startup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Start at Login</p>
                <p className="text-xs text-muted-foreground">
                  Automatically start Digital Wellbeing when you log in to track
                  your usage in the background
                </p>
              </div>
              <Switch
                checked={autostartStatus?.enabled || false}
                onCheckedChange={handleToggleAutostart}
                disabled={autostartLoading}
              />
            </div>
            {autostartStatus && (
              <div className="flex flex-wrap gap-2">
                {autostartStatus.systemd_installed && (
                  <Badge
                    variant={autostartStatus.systemd_running ? "success" : "secondary"}
                  >
                    Systemd: {autostartStatus.systemd_running ? "Running" : "Stopped"}
                  </Badge>
                )}
                {autostartStatus.xdg_installed && (
                  <Badge variant="success">XDG Autostart: Enabled</Badge>
                )}
              </div>
            )}
            {autostartMessage && (
              <div
                className={cn(
                  "text-sm p-3 rounded-lg",
                  autostartMessage.startsWith("Error")
                    ? "bg-destructive/10 text-destructive"
                    : "bg-emerald-500/10 text-emerald-600"
                )}
              >
                {autostartMessage}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Limit Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Get notified when approaching (80%) or exceeding app time
                  limits
                </p>
              </div>
              <Button variant="outline" onClick={handleTestNotification}>
                Test Notification
              </Button>
            </div>
            {notificationStatus && (
              <div
                className={cn(
                  "text-sm p-3 rounded-lg",
                  notificationStatus.startsWith("Error")
                    ? "bg-destructive/10 text-destructive"
                    : "bg-emerald-500/10 text-emerald-600"
                )}
              >
                {notificationStatus}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Theme Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Theme</p>
                <p className="text-xs text-muted-foreground">
                  Select your preferred color scheme
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  className="gap-2"
                >
                  <Sun className="h-4 w-4" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="gap-2"
                >
                  <Moon className="h-4 w-4" />
                  Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                  className="gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  System
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Custom Theme File</p>
                  <p className="text-xs text-muted-foreground">
                    Advanced: edit the theme.json file for full customization
                  </p>
                </div>
                <code className="text-xs bg-muted px-3 py-1.5 rounded-md">
                  {themePath || "~/.config/wellbeing/theme.json"}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">0.1.0</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Platform</span>
                <span className="font-medium">Linux (Tauri + React)</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Data Location</span>
                <span className="font-medium">~/.local/share/wellbeing/</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Keyboard Shortcuts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.action}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-2">
                    {shortcut.keys.map((key, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded shadow-sm">
                          {key}
                        </kbd>
                        {i < shortcut.keys.length - 1 && (
                          <span className="text-muted-foreground">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {shortcut.action}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
