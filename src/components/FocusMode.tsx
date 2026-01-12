import { useState, useEffect } from "react";
import {
  Target,
  Play,
  Square,
  Plus,
  Trash2,
  Calendar,
  Settings2,
  Zap,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { api } from "@/services/api";
import type { FocusSettings, FocusSession, FocusSchedule, InstalledApp } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const DURATION_PRESETS = [
  { value: 15, label: "15 min" },
  { value: 25, label: "25 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

export const FocusMode = () => {
  const [settings, setSettings] = useState<FocusSettings | null>(null);
  const [session, setSession] = useState<FocusSession | null>(null);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [showAddApp, setShowAddApp] = useState(false);
  const [showAddSchedule, setShowAddSchedule] = useState(false);

  const [selectedDuration, setSelectedDuration] = useState(25);
  const [customDuration, setCustomDuration] = useState("");
  const [newSchedule, setNewSchedule] = useState<Partial<FocusSchedule>>({
    name: "",
    days: [],
    start_time: "09:00",
    end_time: "17:00",
    blocked_apps: [],
    enabled: true,
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Load initial data
  useEffect(() => {
    loadData();
    api.getInstalledApps().then(setInstalledApps).catch(console.error);
  }, []);

  // Poll for session status updates
  useEffect(() => {
    const interval = setInterval(loadSession, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [settingsData, sessionData] = await Promise.all([
        api.getFocusSettings(),
        api.getFocusSession(),
      ]);
      setSettings(settingsData);
      setSession(sessionData);
    } catch (error) {
      console.error("Failed to load focus mode data:", error);
    }
  };

  const loadSession = async () => {
    try {
      const sessionData = await api.getFocusSession();
      setSession(sessionData);
    } catch (error) {
      console.error("Failed to load focus session:", error);
    }
  };

  const handleStartSession = async () => {
    const duration = customDuration ? parseInt(customDuration) : selectedDuration;
    try {
      const newSession = await api.startFocusSession(duration);
      setSession(newSession);
      toast.success(`Focus mode started for ${duration} minutes`);
    } catch (error) {
      toast.error("Failed to start focus session");
      console.error(error);
    }
  };

  const handleStopSession = async () => {
    try {
      const newSession = await api.stopFocusSession();
      setSession(newSession);
      toast.success("Focus mode ended");
    } catch (error) {
      toast.error("Failed to stop focus session");
      console.error(error);
    }
  };

  const handleExtendSession = async (minutes: number) => {
    try {
      const newSession = await api.extendFocusSession(minutes);
      if (newSession) {
        setSession(newSession);
        toast.success(`Extended focus by ${minutes} minutes`);
      }
    } catch (error) {
      toast.error("Failed to extend session");
      console.error(error);
    }
  };

  const handleAddBlockedApp = async (appName: string) => {
    if (!settings) return;
    
    const updatedSettings: FocusSettings = {
      ...settings,
      blocked_apps: [...settings.blocked_apps, appName],
    };
    
    try {
      await api.setFocusSettings(updatedSettings);
      setSettings(updatedSettings);
      setShowAddApp(false);
      setSearchQuery("");
      toast.success(`Added ${appName} to focus blocklist`);
    } catch (error) {
      toast.error("Failed to add app");
      console.error(error);
    }
  };

  const handleRemoveBlockedApp = async (appName: string) => {
    if (!settings) return;
    
    const updatedSettings: FocusSettings = {
      ...settings,
      blocked_apps: settings.blocked_apps.filter((a) => a !== appName),
    };
    
    try {
      await api.setFocusSettings(updatedSettings);
      setSettings(updatedSettings);
      toast.success(`Removed ${appName} from focus blocklist`);
    } catch (error) {
      toast.error("Failed to remove app");
      console.error(error);
    }
  };



  const handleAddSchedule = async () => {
    if (!settings || !newSchedule.name || newSchedule.days?.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    const schedule: FocusSchedule = {
      id: crypto.randomUUID(),
      name: newSchedule.name || "",
      days: newSchedule.days || [],
      start_time: newSchedule.start_time || "09:00",
      end_time: newSchedule.end_time || "17:00",
      blocked_apps: newSchedule.blocked_apps || [],
      enabled: newSchedule.enabled ?? true,
    };

    const updatedSettings: FocusSettings = {
      ...settings,
      schedules: [...settings.schedules, schedule],
    };

    try {
      await api.setFocusSettings(updatedSettings);
      setSettings(updatedSettings);
      setShowAddSchedule(false);
      setNewSchedule({
        name: "",
        days: [],
        start_time: "09:00",
        end_time: "17:00",
        blocked_apps: [],
        enabled: true,
      });
      toast.success("Schedule added");
    } catch (error) {
      toast.error("Failed to add schedule");
      console.error(error);
    }
  };

  const handleRemoveSchedule = async (scheduleId: string) => {
    if (!settings) return;

    const updatedSettings: FocusSettings = {
      ...settings,
      schedules: settings.schedules.filter((s) => s.id !== scheduleId),
    };

    try {
      await api.setFocusSettings(updatedSettings);
      setSettings(updatedSettings);
      toast.success("Schedule removed");
    } catch (error) {
      toast.error("Failed to remove schedule");
      console.error(error);
    }
  };

  const handleToggleSchedule = async (scheduleId: string, enabled: boolean) => {
    if (!settings) return;

    const updatedSettings: FocusSettings = {
      ...settings,
      schedules: settings.schedules.map((s) =>
        s.id === scheduleId ? { ...s, enabled } : s
      ),
    };

    try {
      await api.setFocusSettings(updatedSettings);
      setSettings(updatedSettings);
    } catch (error) {
      toast.error("Failed to update schedule");
      console.error(error);
    }
  };

  const filteredApps = installedApps.filter((app) => {
    const notBlocked = !settings?.blocked_apps.includes(app.name);
    const matchesSearch =
      searchQuery === "" ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase());
    return notBlocked && matchesSearch;
  });

  const formatTimeRemaining = (minutes: number | null) => {
    if (minutes === null) return "Indefinite";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (!settings || !session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Session Card */}
      <Card
        className={cn(
          "transition-all duration-300",
          session.is_active && "border-primary ring-2 ring-primary/20"
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Focus Mode
            {session.is_active && (
              <Badge variant="default" className="ml-2">
                <Zap className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {session.is_active ? (
            <div className="space-y-4">
              {/* Session Info */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {session.is_scheduled
                      ? `Scheduled: ${session.schedule_name}`
                      : "Manual Session"}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatTimeRemaining(session.minutes_remaining)} remaining
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleStopSession}
                  className="gap-2"
                >
                  <Square className="h-4 w-4" />
                  End Focus
                </Button>
              </div>

              {/* Blocked Apps */}
              {session.blocked_apps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Blocking:</p>
                  <div className="flex flex-wrap gap-2">
                    {session.blocked_apps.map((app) => (
                      <Badge key={app} variant="secondary">
                        {app}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Extend */}
              {!session.is_scheduled && session.duration_minutes && (
                <div className="flex gap-2 pt-2">
                  <p className="text-sm text-muted-foreground mr-2">Extend:</p>
                  {[5, 10, 15].map((mins) => (
                    <Button
                      key={mins}
                      variant="outline"
                      size="sm"
                      onClick={() => handleExtendSession(mins)}
                    >
                      +{mins}m
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Duration Selection */}
              <div className="space-y-2">
                <Label>Session Duration</Label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map((preset) => (
                    <Button
                      key={preset.value}
                      variant={
                        selectedDuration === preset.value && !customDuration
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        setSelectedDuration(preset.value);
                        setCustomDuration("");
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Custom"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      className="w-20"
                      min={1}
                      max={480}
                    />
                    <span className="text-sm text-muted-foreground">min</span>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <Button
                size="lg"
                onClick={handleStartSession}
                disabled={settings.blocked_apps.length === 0}
                className="w-full gap-2"
              >
                <Play className="h-4 w-4" />
                Start Focus Session
              </Button>

              {settings.blocked_apps.length === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Add apps to block before starting
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked Apps Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Apps to Block
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddApp(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add App
          </Button>
        </CardHeader>
        <CardContent>
          {settings.blocked_apps.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No apps configured. Add apps to block during focus sessions.
            </p>
          ) : (
            <div className="space-y-2">
              {settings.blocked_apps.map((app) => (
                <div
                  key={app}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <span className="font-medium">{app}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveBlockedApp(app)}
                    className="text-destructive hover:text-destructive"
                    disabled={session.is_active}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedules Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Sessions
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddSchedule(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Schedule
          </Button>
        </CardHeader>
        <CardContent>
          {settings.schedules.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No schedules configured. Add schedules for automatic focus
              sessions.
            </p>
          ) : (
            <div className="space-y-3">
              {settings.schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className={cn(
                    "p-4 rounded-lg border",
                    schedule.enabled ? "bg-card" : "bg-muted/50 opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{schedule.name}</span>
                        {schedule.enabled && (
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {schedule.start_time} - {schedule.end_time}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {DAYS_OF_WEEK.map((day) => (
                          <Badge
                            key={day.value}
                            variant={
                              schedule.days.includes(day.value)
                                ? "default"
                                : "outline"
                            }
                            className="text-xs px-2"
                          >
                            {day.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={schedule.enabled}
                        onCheckedChange={(checked) =>
                          handleToggleSchedule(schedule.id, checked)
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSchedule(schedule.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add App Dialog */}
      <Dialog open={showAddApp} onOpenChange={setShowAddApp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add App to Block</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {filteredApps.slice(0, 20).map((app) => (
                  <button
                    key={app.desktop_file}
                    className="w-full p-3 text-left rounded-lg hover:bg-muted transition-colors flex items-center justify-between"
                    onClick={() => handleAddBlockedApp(app.name)}
                  >
                    <span>{app.name}</span>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
                {filteredApps.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No apps found
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Schedule Dialog */}
      <Dialog open={showAddSchedule} onOpenChange={setShowAddSchedule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Focus Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Schedule Name</Label>
              <Input
                placeholder="e.g., Morning Focus"
                value={newSchedule.name}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    variant={
                      newSchedule.days?.includes(day.value)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      const days = newSchedule.days || [];
                      const newDays = days.includes(day.value)
                        ? days.filter((d) => d !== day.value)
                        : [...days, day.value];
                      setNewSchedule({ ...newSchedule, days: newDays });
                    }}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newSchedule.start_time}
                  onChange={(e) =>
                    setNewSchedule({
                      ...newSchedule,
                      start_time: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newSchedule.end_time}
                  onChange={(e) =>
                    setNewSchedule({ ...newSchedule, end_time: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSchedule(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSchedule}>Add Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
