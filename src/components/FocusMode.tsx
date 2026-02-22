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
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center animate-pulse">
            <Target className="h-5 w-5 text-white" />
          </div>
          <span className="text-muted-foreground text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight">Focus Mode</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Block distractions and boost your productivity
          </p>
        </div>
      </header>

      {/* Active Session Card */}
      <Card
        className={cn(
          "transition-all duration-300 border-border/50 overflow-hidden",
          session.is_active && "border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10"
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
              session.is_active 
                ? "bg-gradient-to-br from-primary to-cyan-500 shadow-lg shadow-primary/30" 
                : "bg-gradient-to-br from-slate-500 to-gray-500"
            )}>
              <Target className="h-4 w-4 text-white" />
            </div>
            Focus Session
            {session.is_active && (
              <Badge variant="default" className="ml-2 gap-1 animate-pulse">
                <Zap className="h-3 w-3" />
                Active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {session.is_active ? (
            <div className="space-y-6">
              {/* Timer Display */}
              <div className="flex flex-col items-center justify-center py-6 sm:py-8">
                <div className="relative">
                  {/* Circular Progress Ring */}
                  <div className="w-36 h-36 sm:w-48 sm:h-48 relative">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      {/* Background circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        className="text-muted/30"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="url(#focusGradient)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 45}`}
                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - (session.minutes_remaining || 0) / (session.duration_minutes || 1))}`}
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#D946A0" />
                          <stop offset="100%" stopColor="#E8B931" />
                        </linearGradient>
                      </defs>
                    </svg>
                    {/* Center content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-3xl sm:text-4xl font-bold tracking-tight">
                        {formatTimeRemaining(session.minutes_remaining)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {session.is_scheduled ? session.schedule_name : "remaining"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Blocked Apps */}
              {session.blocked_apps.length > 0 && (
                <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Blocking</p>
                  <div className="flex flex-wrap gap-1.5">
                    {session.blocked_apps.map((app) => (
                      <Badge key={app} variant="secondary" className="text-xs">
                        {app}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleStopSession}
                  className="w-full sm:w-auto gap-2"
                >
                  <Square className="h-4 w-4" />
                  End Focus
                </Button>

                {/* Quick Extend */}
                {!session.is_scheduled && session.duration_minutes && (
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                    <span className="text-xs text-muted-foreground">Extend:</span>
                    {[5, 10, 15].map((mins) => (
                      <Button
                        key={mins}
                        variant="outline"
                        size="sm"
                        onClick={() => handleExtendSession(mins)}
                        className="h-8"
                      >
                        +{mins}m
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Duration Selection */}
              <div className="space-y-3">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Session Duration</Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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
                      className="h-10"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    placeholder="Custom"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    className="w-24"
                    min={1}
                    max={480}
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </div>

              {/* Start Button */}
              <Button
                size="lg"
                onClick={handleStartSession}
                disabled={settings.blocked_apps.length === 0}
                className="w-full gap-2 h-12 text-base shadow-lg hover:shadow-xl transition-all"
              >
                <Play className="h-5 w-5" />
                Start Focus Session
              </Button>

              {settings.blocked_apps.length === 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-xs">Add apps to block before starting a focus session</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked Apps Card */}
      <Card className="border-border/50 hover:shadow-lg transition-all">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
              <Settings2 className="h-4 w-4 text-white" />
            </div>
            Apps to Block
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddApp(true)}
            className="gap-2 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Add App
          </Button>
        </CardHeader>
        <CardContent>
          {settings.blocked_apps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="h-14 w-14 mx-auto mb-3 bg-muted/50 rounded-full flex items-center justify-center">
                <Settings2 className="h-7 w-7 opacity-50" />
              </div>
              <p className="text-sm font-medium">No apps configured</p>
              <p className="text-xs mt-1">Add apps to block during focus sessions.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {settings.blocked_apps.map((app) => (
                <div
                  key={app}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {app.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-sm truncate">{app}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveBlockedApp(app)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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
      <Card className="border-border/50 hover:shadow-lg transition-all">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            Scheduled Sessions
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddSchedule(true)}
            className="gap-2 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Add Schedule
          </Button>
        </CardHeader>
        <CardContent>
          {settings.schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="h-14 w-14 mx-auto mb-3 bg-muted/50 rounded-full flex items-center justify-center">
                <Calendar className="h-7 w-7 opacity-50" />
              </div>
              <p className="text-sm font-medium">No schedules configured</p>
              <p className="text-xs mt-1">Add schedules for automatic focus sessions.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {settings.schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className={cn(
                    "p-4 rounded-xl border transition-all hover:shadow-md",
                    schedule.enabled 
                      ? "bg-card border-border/50 hover:border-primary/30" 
                      : "bg-muted/30 border-border/30 opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{schedule.name}</span>
                        {schedule.enabled && (
                          <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {schedule.start_time} - {schedule.end_time}
                      </p>
                      <div className="flex gap-1 flex-wrap">
                        {DAYS_OF_WEEK.map((day) => (
                          <Badge
                            key={day.value}
                            variant={
                              schedule.days.includes(day.value)
                                ? "default"
                                : "outline"
                            }
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              !schedule.days.includes(day.value) && "opacity-40"
                            )}
                          >
                            {day.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
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
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading">Add App to Block</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-muted/30"
            />
            <ScrollArea className="h-64">
              <div className="space-y-1.5 pr-2">
                {filteredApps.slice(0, 20).map((app) => (
                  <button
                    key={app.desktop_file}
                    className="w-full p-3 text-left rounded-xl hover:bg-muted transition-colors flex items-center justify-between group"
                    onClick={() => handleAddBlockedApp(app.name)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {app.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{app.name}</span>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
                {filteredApps.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading">Add Focus Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Schedule Name</Label>
              <Input
                placeholder="e.g., Morning Focus"
                value={newSchedule.name}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Days</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    variant={
                      newSchedule.days?.includes(day.value)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className="h-8 w-10 text-xs"
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
                <Label className="text-xs font-medium">Start Time</Label>
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
                <Label className="text-xs font-medium">End Time</Label>
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
          <DialogFooter className="gap-2 sm:gap-0">
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
