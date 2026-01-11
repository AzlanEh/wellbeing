import { useState, useEffect } from "react";
import { Plus, Trash2, Clock, Ban, Lock, Search } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { formatDuration } from "@/utils/formatters";
import { api } from "@/services/api";
import type { InstalledApp } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const AppLimits = () => {
  const {
    appLimits,
    dailyStats,
    blockedApps,
    setAppLimit,
    removeAppLimit,
    loadBlockedApps,
  } = useAppStore();
  const [newLimit, setNewLimit] = useState({
    appName: "",
    minutes: 60,
    blockWhenExceeded: false,
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [customAppName, setCustomAppName] = useState("");
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const trackedApps = dailyStats?.apps || [];

  useEffect(() => {
    api.getInstalledApps().then(setInstalledApps).catch(console.error);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadBlockedApps();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadBlockedApps]);

  const filteredInstalledApps = installedApps.filter((app) => {
    const notLimited = !appLimits.find(
      (l) => l.app_name.toLowerCase() === app.name.toLowerCase()
    );
    const matchesSearch =
      searchQuery === "" ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase());
    return notLimited && matchesSearch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const appName =
      newLimit.appName === "__custom__" ? customAppName : newLimit.appName;
    if (appName && newLimit.minutes > 0) {
      await setAppLimit(appName, newLimit.minutes, newLimit.blockWhenExceeded);
      setNewLimit({ appName: "", minutes: 60, blockWhenExceeded: false });
      setCustomAppName("");
      setSearchQuery("");
      setShowAddForm(false);
    }
  };

  const handleRemove = async (appName: string) => {
    setDeleteConfirm(appName);
  };

  const confirmRemove = async () => {
    if (deleteConfirm) {
      await removeAppLimit(deleteConfirm);
      setDeleteConfirm(null);
    }
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
    const app = trackedApps.find(
      (a) => a.app_name.toLowerCase() === appName.toLowerCase()
    );
    return app?.duration_seconds || 0;
  };

  const getProgressPercentage = (appName: string, limitMinutes: number) => {
    const usage = getUsageForApp(appName);
    const limitSeconds = limitMinutes * 60;
    return Math.min((usage / limitSeconds) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-destructive";
    if (percentage >= 80) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const isAppBlocked = (appName: string) => blockedApps.includes(appName);

  const quickTimeOptions = [15, 30, 60, 120];

  return (
    <div className="max-w-3xl space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">App Limits</h2>
          <p className="text-muted-foreground text-sm">
            Set daily time limits for applications
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Limit
        </Button>
      </header>

      {blockedApps.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 rounded-full bg-destructive flex items-center justify-center text-white">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-destructive">
                {blockedApps.length} app{blockedApps.length > 1 ? "s" : ""}{" "}
                blocked
              </p>
              <p className="text-sm text-muted-foreground">
                {blockedApps.join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add App Limit</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="space-y-2">
                <Label htmlFor="appSearch">Search Applications</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="appSearch"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type to search installed apps..."
                    className="pl-9"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2 flex-1 overflow-hidden">
                <Label>Select Application</Label>
                <ScrollArea className="h-[250px] rounded-md border p-3">
                  {trackedApps.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Recently Used
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {trackedApps
                          .filter(
                            (app) =>
                              !appLimits.find(
                                (l) => l.app_name === app.app_name
                              ) &&
                              (searchQuery === "" ||
                                app.app_name
                                  .toLowerCase()
                                  .includes(searchQuery.toLowerCase()))
                          )
                          .slice(0, 8)
                          .map((app) => (
                            <button
                              key={app.app_name}
                              type="button"
                              className={cn(
                                "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors",
                                newLimit.appName === app.app_name
                                  ? "border-primary bg-primary/10"
                                  : "border-transparent bg-muted hover:bg-muted/80"
                              )}
                              onClick={() =>
                                setNewLimit({ ...newLimit, appName: app.app_name })
                              }
                            >
                              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                                {app.app_name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs text-center truncate w-full">
                                {app.app_name}
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Installed Apps ({filteredInstalledApps.length})
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {filteredInstalledApps.slice(0, 24).map((app) => (
                        <button
                          key={app.desktop_file}
                          type="button"
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors",
                            newLimit.appName === app.name
                              ? "border-primary bg-primary/10"
                              : "border-transparent bg-muted hover:bg-muted/80"
                          )}
                          onClick={() =>
                            setNewLimit({ ...newLimit, appName: app.name })
                          }
                        >
                          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                            {app.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs text-center truncate w-full">
                            {app.name}
                          </span>
                        </button>
                      ))}
                    </div>
                    {filteredInstalledApps.length > 24 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Showing 24 of {filteredInstalledApps.length} apps. Use
                        search to find more.
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Custom
                    </p>
                    <button
                      type="button"
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors w-[calc(25%-6px)]",
                        newLimit.appName === "__custom__"
                          ? "border-primary bg-primary/10"
                          : "border-transparent bg-muted hover:bg-muted/80"
                      )}
                      onClick={() =>
                        setNewLimit({ ...newLimit, appName: "__custom__" })
                      }
                    >
                      <div className="h-9 w-9 rounded-lg bg-muted-foreground flex items-center justify-center text-white font-semibold">
                        +
                      </div>
                      <span className="text-xs text-center">Enter custom</span>
                    </button>
                  </div>
                </ScrollArea>
              </div>

              {newLimit.appName === "__custom__" && (
                <div className="space-y-2">
                  <Label htmlFor="customAppName">Custom App Name</Label>
                  <Input
                    id="customAppName"
                    value={customAppName}
                    onChange={(e) => setCustomAppName(e.target.value)}
                    placeholder="Enter app name (e.g., Firefox, Discord)"
                    required
                  />
                </div>
              )}

              {newLimit.appName && newLimit.appName !== "__custom__" && (
                <div className="rounded-lg bg-primary/10 p-3 text-sm">
                  Selected: <strong className="text-primary">{newLimit.appName}</strong>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="minutes">Daily Limit</Label>
                <div className="flex items-center gap-3">
                  <Input
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
                    className="w-20"
                    required
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                  <div className="flex gap-1 ml-auto">
                    {quickTimeOptions.map((m) => (
                      <Button
                        key={m}
                        type="button"
                        variant={newLimit.minutes === m ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewLimit({ ...newLimit, minutes: m })}
                      >
                        {m < 60 ? `${m}m` : `${m / 60}h`}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="blockWhenExceeded"
                  checked={newLimit.blockWhenExceeded}
                  onChange={(e) =>
                    setNewLimit({
                      ...newLimit,
                      blockWhenExceeded: e.target.checked,
                    })
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="blockWhenExceeded" className="cursor-pointer">
                    Block app when limit is exceeded
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, the app will be automatically closed once the
                    daily limit is reached.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setCustomAppName("");
                  setSearchQuery("");
                  setNewLimit({
                    appName: "",
                    minutes: 60,
                    blockWhenExceeded: false,
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !newLimit.appName ||
                  (newLimit.appName === "__custom__" && !customAppName)
                }
              >
                Add Limit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
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
              <Card
                key={limit.id}
                className={cn(blocked && "border-destructive/30 bg-destructive/5")}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center text-white font-semibold",
                          blocked ? "bg-destructive" : "bg-primary"
                        )}
                      >
                        {blocked ? (
                          <Ban className="h-5 w-5" />
                        ) : (
                          limit.app_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{limit.app_name}</span>
                          {limit.block_when_exceeded && (
                            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(usage)} / {formatDuration(limitSeconds)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {progress >= 100 &&
                        limit.block_when_exceeded &&
                        !blocked && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleBlockNow(limit.app_name)}
                          >
                            Block Now
                          </Button>
                        )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemove(limit.app_name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Progress
                    value={progress}
                    className="h-2 mb-2"
                    indicatorClassName={getProgressColor(progress)}
                  />

                  <div className="text-xs">
                    {blocked ? (
                      <Badge variant="destructive">Blocked for today</Badge>
                    ) : progress >= 100 ? (
                      <Badge variant="destructive">
                        Limit exceeded!
                        {limit.block_when_exceeded && " App will be blocked."}
                      </Badge>
                    ) : progress >= 80 ? (
                      <Badge variant="warning">Approaching limit</Badge>
                    ) : (
                      <Badge variant="success">
                        {Math.round(100 - progress)}% remaining
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No limits set</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Set daily time limits to help manage your screen time.
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                Add Your First Limit
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove App Limit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the limit for <strong>{deleteConfirm}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Limit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
