import { useState, useEffect } from "react";
import { Moon, Sun, Monitor, Download, FileJson, FileText, Timer, Keyboard, Bell } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { api } from "@/services/api";
import { useDarkMode } from "@/hooks/useDarkMode";
import type { AutostartStatus, BreakSettings, NotificationSettings } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ExportFormat = "csv" | "json";

export const Settings = () => {
  const [themePath, setThemePath] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  const [autostartStatus, setAutostartStatus] = useState<AutostartStatus | null>(null);
  const [autostartLoading, setAutostartLoading] = useState(false);
  const [autostartMessage, setAutostartMessage] = useState<string | null>(null);
  const { theme, setTheme } = useDarkMode();

  // Export state
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    // Default to 30 days ago
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split("T")[0];
  });

  // Break reminder state
  const [breakSettings, setBreakSettings] = useState<BreakSettings>({
    enabled: false,
    work_minutes: 25,
    break_minutes: 5,
    show_notification: true,
    play_sound: true,
  });
  const [breakSettingsLoading, setBreakSettingsLoading] = useState(false);

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: true,
    warning_threshold: 80,
    exceeded_threshold: 100,
    dnd_enabled: false,
    dnd_start_hour: 22,
    dnd_end_hour: 8,
  });
  const [notificationSettingsLoading, setNotificationSettingsLoading] = useState(false);

  useEffect(() => {
    api.getThemePath().then(setThemePath);
    loadAutostartStatus();
    loadBreakSettings();
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const settings = await api.getNotificationSettings();
      setNotificationSettings(settings);
    } catch (error) {
      console.error("Failed to load notification settings:", error);
    }
  };

  const handleNotificationSettingsChange = async (updates: Partial<NotificationSettings>) => {
    const newSettings = { ...notificationSettings, ...updates };
    setNotificationSettings(newSettings);
    setNotificationSettingsLoading(true);
    
    try {
      await api.setNotificationSettings(newSettings);
    } catch (error) {
      console.error("Failed to save notification settings:", error);
    }
    
    setNotificationSettingsLoading(false);
  };

  const loadBreakSettings = async () => {
    try {
      const settings = await api.getBreakSettings();
      setBreakSettings(settings);
    } catch (error) {
      console.error("Failed to load break settings:", error);
    }
  };

  const handleBreakSettingsChange = async (updates: Partial<BreakSettings>) => {
    const newSettings = { ...breakSettings, ...updates };
    setBreakSettings(newSettings);
    setBreakSettingsLoading(true);
    
    try {
      await api.setBreakSettings(newSettings);
    } catch (error) {
      console.error("Failed to save break settings:", error);
    }
    
    setBreakSettingsLoading(false);
  };

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

  const handleExport = async (format: ExportFormat) => {
    setExportLoading(true);
    setExportMessage(null);

    try {
      // Fetch the data
      const records = await api.exportUsageData(startDate, endDate);

      if (records.length === 0) {
        setExportMessage("No data found for the selected date range.");
        setExportLoading(false);
        setTimeout(() => setExportMessage(null), 5000);
        return;
      }

      // Format the data
      let content: string;
      let defaultFileName: string;
      let fileFilter: { name: string; extensions: string[] };

      if (format === "csv") {
        content = await api.formatExportCsv(records);
        defaultFileName = `wellbeing-export-${startDate}-to-${endDate}.csv`;
        fileFilter = { name: "CSV Files", extensions: ["csv"] };
      } else {
        content = await api.formatExportJson(records);
        defaultFileName = `wellbeing-export-${startDate}-to-${endDate}.json`;
        fileFilter = { name: "JSON Files", extensions: ["json"] };
      }

      // Show save dialog
      const filePath = await save({
        defaultPath: defaultFileName,
        filters: [fileFilter],
        title: "Export Usage Data",
      });

      if (filePath) {
        // Write the file
        await writeTextFile(filePath, content);
        setExportMessage(`Exported ${records.length} records to ${filePath}`);
      } else {
        setExportMessage("Export cancelled.");
      }
    } catch (error) {
      setExportMessage(`Export failed: ${error}`);
    }

    setExportLoading(false);
    setTimeout(() => setExportMessage(null), 5000);
  };

  const shortcuts = [
    { keys: ["Ctrl", "R"], action: "Refresh data" },
    { keys: ["Ctrl", "1"], action: "Dashboard" },
    { keys: ["Ctrl", "2"], action: "History" },
    { keys: ["Ctrl", "3"], action: "App Limits" },
    { keys: ["Ctrl", "4"], action: "Settings" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Customize your Digital Wellbeing experience
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Appearance Section */}
        <Card className="border-border/50 hover:shadow-lg transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <Monitor className="h-4 w-4 text-white" />
              </div>
               Appearance
            </CardTitle>
            <CardDescription className="text-xs">Customize the application theme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Theme Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  className="gap-1.5 w-full h-9"
                >
                  <Sun className="h-3.5 w-3.5" />
                  <span className="text-xs">Light</span>
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="gap-1.5 w-full h-9"
                >
                  <Moon className="h-3.5 w-3.5" />
                  <span className="text-xs">Dark</span>
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                  className="gap-1.5 w-full h-9"
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span className="text-xs">System</span>
                </Button>
              </div>
            </div>

            <div className="pt-3 border-t">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Config Location</p>
              <code className="block text-[10px] bg-muted p-2 rounded-lg break-all font-mono">
                {themePath || "~/.config/wellbeing/theme.json"}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card className="border-border/50 hover:shadow-lg transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Bell className="h-4 w-4 text-white" />
              </div>
               Notifications
            </CardTitle>
            <CardDescription className="text-xs">Manage system alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
               <div className="space-y-0.5">
                  <p className="font-medium text-sm">Enable Notifications</p>
                  <p className="text-xs text-muted-foreground">
                     Allow system notifications
                  </p>
               </div>
               <Switch
                  checked={notificationSettings.enabled}
                  onCheckedChange={(enabled) => handleNotificationSettingsChange({ enabled })}
                  disabled={notificationSettingsLoading}
               />
            </div>

            <div className="space-y-3 pt-3 border-t">
               <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs">Warning Threshold</Label>
                    <span className="text-xs font-medium text-primary">{notificationSettings.warning_threshold}%</span>
                  </div>
                  <input 
                     type="range"
                     min="50"
                     max="95"
                     step="5"
                     value={notificationSettings.warning_threshold}
                     className="w-full accent-primary h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
                     onChange={(e) => handleNotificationSettingsChange({
                        warning_threshold: parseInt(e.target.value) || 80,
                     })}
                     disabled={!notificationSettings.enabled || notificationSettingsLoading}
                  />
               </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
               <div className="space-y-0.5">
                  <p className="font-medium text-xs">Test Notification</p>
                  <p className="text-[10px] text-muted-foreground">
                     Send a sample alert
                  </p>
               </div>
               <Button variant="secondary" size="sm" onClick={handleTestNotification} className="h-8">
                  Test
               </Button>
            </div>
            {notificationStatus && (
               <p className={cn(
                  "text-xs p-2 rounded-lg",
                  notificationStatus.includes("Error") 
                     ? "bg-destructive/10 text-destructive" 
                     : "bg-green-500/10 text-green-600"
               )}>
                  {notificationStatus}
               </p>
            )}
          </CardContent>
        </Card>

        {/* Startup Section */}
        <Card className="border-border/50 hover:shadow-lg transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <span className="h-2.5 w-2.5 bg-white rounded-full animate-pulse" />
              </div>
               System Startup
            </CardTitle>
            <CardDescription className="text-xs">Configure automatic launch behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
              <div className="space-y-0.5">
                <p className="font-medium text-sm">Start at Login</p>
                <p className="text-[10px] text-muted-foreground">
                  Launch automatically when you sign in
                </p>
              </div>
              <Switch
                checked={autostartStatus?.enabled || false}
                onCheckedChange={handleToggleAutostart}
                disabled={autostartLoading}
              />
            </div>
            {autostartStatus && (
              <div className="flex flex-wrap gap-1.5">
                {autostartStatus.systemd_installed && (
                  <Badge
                    variant={autostartStatus.systemd_running ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    Systemd: {autostartStatus.systemd_running ? "Running" : "Stopped"}
                  </Badge>
                )}
                {autostartStatus.xdg_installed && (
                  <Badge variant="default" className="text-[10px]">XDG: Enabled</Badge>
                )}
              </div>
            )}
            {autostartMessage && (
              <p className={cn(
                  "text-xs p-2 rounded-lg",
                  autostartMessage.startsWith("Error") 
                    ? "bg-destructive/10 text-destructive" 
                    : "bg-green-500/10 text-green-600"
                )}>
                {autostartMessage}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Break Reminders Section */}
        <Card className="lg:col-span-2 border-border/50 hover:shadow-lg transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
                <Timer className="h-4 w-4 text-white" />
              </div>
              Break Reminders
            </CardTitle>
            <CardDescription className="text-xs">Manage your work/break cycles (Pomodoro)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium text-sm">Enable Break Reminders</p>
                <p className="text-xs text-muted-foreground">
                  Get reminded to take breaks periodically
                </p>
              </div>
              <Switch
                checked={breakSettings.enabled}
                onCheckedChange={(enabled) => handleBreakSettingsChange({ enabled })}
                disabled={breakSettingsLoading}
              />
            </div>

            {breakSettings.enabled && (
              <div className="animate-in slide-in-from-top-2 duration-300 space-y-4 border-t pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <div className="flex justify-between">
                         <Label className="text-xs">Work Duration</Label>
                         <span className="text-xs font-medium text-primary">{breakSettings.work_minutes} min</span>
                       </div>
                       <input 
                          type="range"
                          min="1"
                          max="120"
                          value={breakSettings.work_minutes}
                          className="w-full accent-primary h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
                          onChange={(e) => handleBreakSettingsChange({
                             work_minutes: parseInt(e.target.value) || 25,
                          })}
                       />
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between">
                         <Label className="text-xs">Break Duration</Label>
                         <span className="text-xs font-medium text-primary">{breakSettings.break_minutes} min</span>
                       </div>
                       <input 
                          type="range"
                          min="1"
                          max="60"
                          value={breakSettings.break_minutes}
                          className="w-full accent-primary h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
                          onChange={(e) => handleBreakSettingsChange({
                             break_minutes: parseInt(e.target.value) || 5,
                          })}
                       />
                    </div>
                  </div>
                  
                  <div className="flex flex-col justify-center gap-3 bg-muted/30 p-4 rounded-xl border border-border/50">
                    <div className="flex items-center justify-between">
                      <Label className="cursor-pointer text-sm">Show Notification</Label>
                      <Switch
                        checked={breakSettings.show_notification}
                        onCheckedChange={(show_notification) =>
                          handleBreakSettingsChange({ show_notification })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="cursor-pointer text-sm">Play Sound</Label>
                      <Switch
                        checked={breakSettings.play_sound}
                        onCheckedChange={(play_sound) =>
                          handleBreakSettingsChange({ play_sound })
                        }
                      />
                    </div>
                    
                    <div className="mt-2 pt-3 border-t border-border/50">
                       <Badge variant="outline" className="text-xs w-full justify-center py-1">
                          {breakSettings.work_minutes}m Work → {breakSettings.break_minutes}m Break
                       </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Export Section */}
        <Card className="border-border/50 hover:shadow-lg transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <Download className="h-4 w-4 text-white" />
              </div>
              Export Data
            </CardTitle>
            <CardDescription className="text-xs">Download your usage history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start-date" className="text-[10px] uppercase tracking-wider text-muted-foreground">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  className="text-sm h-9"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-date" className="text-[10px] uppercase tracking-wider text-muted-foreground">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  className="text-sm h-9"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => handleExport("csv")}
                disabled={exportLoading}
                className="w-full gap-1.5 h-9"
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="text-xs">CSV</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("json")}
                disabled={exportLoading}
                className="w-full gap-1.5 h-9"
              >
                <FileJson className="h-3.5 w-3.5" />
                <span className="text-xs">JSON</span>
              </Button>
            </div>

            {exportMessage && (
              <p className={cn(
                  "text-[10px] p-2 rounded-lg text-center",
                  exportMessage.includes("failed") || exportMessage.includes("Error")
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground"
                )}>
                {exportMessage}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card className="border-border/50 hover:shadow-lg transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center">
                <Keyboard className="h-4 w-4 text-white" />
              </div>
              Shortcuts
            </CardTitle>
            <CardDescription className="text-xs">Keyboard navigation guide</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.action}
                  className="flex items-center justify-between text-sm group hover:bg-muted/50 p-2 rounded-lg transition-colors"
                >
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    {shortcut.action}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {shortcut.keys.map((key, i) => (
                      <span key={i} className="flex items-center gap-0.5">
                        <kbd className="px-1.5 py-0.5 text-[9px] font-bold font-mono bg-muted border border-border rounded shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
                          {key}
                        </kbd>
                        {i < shortcut.keys.length - 1 && (
                          <span className="text-muted-foreground text-[9px]">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* About Section - Full Width */}
        <Card className="lg:col-span-2 border-border/50 hover:shadow-lg transition-all bg-gradient-to-br from-primary/5 to-cyan-500/5">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6">
             <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gradient-to-br from-primary to-cyan-500 text-white rounded-xl flex items-center justify-center text-xl font-bold shadow-lg shadow-primary/30">
                   W
                </div>
                <div>
                   <h3 className="font-bold text-base sm:text-lg font-heading">Digital Wellbeing</h3>
                   <p className="text-xs text-muted-foreground">Version 0.1.0 • Linux (Tauri + React)</p>
                </div>
             </div>
             <div className="text-[10px] text-muted-foreground bg-background/50 px-3 py-1.5 rounded-full border border-border/50 font-mono">
                ~/.local/share/wellbeing/
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
