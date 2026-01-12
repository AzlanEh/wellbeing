import { useState, useEffect } from "react";
import { Plus, Trash2, Clock, Ban, Lock, Search, AlertCircle, Shield } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { formatDuration } from "@/utils/formatters";
import { api } from "@/services/api";
import type { InstalledApp } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">App Limits</h2>
          <p className="text-muted-foreground mt-2">
            Set healthy boundaries for your application usage
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="self-start md:self-auto shadow-lg hover:shadow-xl transition-all" aria-label="Add new app limit">
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          Add New Limit
        </Button>
      </header>

      {blockedApps.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5 animate-in slide-in-from-top-2 duration-300">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center text-destructive" aria-hidden="true">
              <Ban className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-destructive flex items-center gap-2">
                Active Restrictions
                <Badge variant="destructive" className="ml-2">{blockedApps.length}</Badge>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                The following apps are currently blocked: <span className="font-medium text-foreground">{blockedApps.join(", ")}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list" aria-label="Configured app limits">
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
                className={cn(
                    "hover:shadow-md transition-all group overflow-hidden relative",
                    blocked && "border-destructive/50 bg-destructive/5"
                )}
                role="listitem"
              >
                {/* Progress bar background for the card header */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
                    <div 
                        className={cn("h-full transition-all duration-500", getProgressColor(progress))} 
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <CardHeader className="pb-3 pt-5">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div
                                className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm transition-transform group-hover:scale-105",
                                blocked ? "bg-destructive" : "bg-primary"
                                )}
                                aria-hidden="true"
                            >
                                {blocked ? (
                                <Ban className="h-5 w-5" />
                                ) : (
                                limit.app_name.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold truncate max-w-[120px]" title={limit.app_name}>
                                    {limit.app_name}
                                </CardTitle>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatDuration(limitSeconds)} limit</span>
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemove(limit.app_name)}
                            aria-label={`Remove limit for ${limit.app_name}`}
                        >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Used</span>
                        <span className={cn("font-medium", progress > 100 && "text-destructive")}>
                            {formatDuration(usage)}
                        </span>
                    </div>
                    <Progress
                        value={progress}
                        className="h-2"
                        indicatorClassName={getProgressColor(progress)}
                        aria-label={`${limit.app_name} usage: ${Math.round(progress)}% of daily limit`}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                     <div className="text-xs">
                        {blocked ? (
                        <Badge variant="destructive" className="gap-1 pl-1 pr-2">
                            <Ban className="h-3 w-3" /> Blocked
                        </Badge>
                        ) : progress >= 100 ? (
                        <Badge variant="destructive" className="gap-1 pl-1 pr-2">
                            <AlertCircle className="h-3 w-3" /> Exceeded
                        </Badge>
                        ) : (
                        <Badge variant="secondary" className={cn("gap-1 pl-1 pr-2 font-normal", 
                            progress >= 80 ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20" : "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                        )}>
                            <Shield className="h-3 w-3" />
                            {Math.round(100 - progress)}% left
                        </Badge>
                        )}
                    </div>

                    {limit.block_when_exceeded && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                            <Lock className="h-3 w-3" />
                            <span>Auto-block</span>
                        </div>
                    )}
                  </div>

                  {/* Manual Block Action if exceeded but not yet blocked (rare case or manual intervention) */}
                  {progress >= 100 && !blocked && limit.block_when_exceeded && (
                     <Button 
                        variant="destructive" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => handleBlockNow(limit.app_name)}
                     >
                        Block Now
                     </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="col-span-full border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                 <Clock className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Limits Configured</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Take control of your digital wellbeing by setting daily time limits for distracting applications.
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Limit
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl">Add Usage Limit</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 pt-2 space-y-6 flex-1 overflow-hidden flex flex-col">
              
              <div className="space-y-3">
                <Label htmlFor="appSearch">Find Application</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="appSearch"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search apps..."
                    className="pl-9 bg-muted/30"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2 flex-1 overflow-hidden min-h-[200px]">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Select App</Label>
                <ScrollArea className="h-[240px] rounded-xl border bg-muted/10 p-4">
                  {trackedApps.length > 0 && (
                    <div className="mb-6">
                      <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <Clock className="h-3 w-3" /> Recently Used
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                                "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all hover:shadow-sm",
                                newLimit.appName === app.app_name
                                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                                  : "border-border bg-card hover:border-primary/50"
                              )}
                              onClick={() =>
                                setNewLimit({ ...newLimit, appName: app.app_name })
                              }
                            >
                              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                {app.app_name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs text-center truncate w-full font-medium">
                                {app.app_name}
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-6">
                    <p className="text-xs font-medium text-muted-foreground mb-3">All Installed Apps</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {filteredInstalledApps.slice(0, 24).map((app) => (
                        <button
                          key={app.desktop_file}
                          type="button"
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all hover:shadow-sm",
                            newLimit.appName === app.name
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border bg-card hover:border-primary/50"
                          )}
                          onClick={() =>
                            setNewLimit({ ...newLimit, appName: app.name })
                          }
                        >
                          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm">
                            {app.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs text-center truncate w-full font-medium">
                            {app.name}
                          </span>
                        </button>
                      ))}
                      
                      {/* Custom App Button */}
                      <button
                        type="button"
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-lg border border-dashed transition-all hover:shadow-sm",
                          newLimit.appName === "__custom__"
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border bg-card hover:border-primary/50"
                        )}
                        onClick={() =>
                          setNewLimit({ ...newLimit, appName: "__custom__" })
                        }
                      >
                        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                          <Plus className="h-4 w-4" />
                        </div>
                        <span className="text-xs text-center font-medium">Custom App</span>
                      </button>
                    </div>
                    
                    {filteredInstalledApps.length > 24 && (
                      <p className="text-xs text-muted-foreground mt-4 text-center">
                        + {filteredInstalledApps.length - 24} more apps available via search
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {newLimit.appName === "__custom__" && (
                <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                  <Label htmlFor="customAppName">App Name</Label>
                  <Input
                    id="customAppName"
                    value={customAppName}
                    onChange={(e) => setCustomAppName(e.target.value)}
                    placeholder="e.g. Firefox"
                    required
                    className="bg-muted/30"
                  />
                </div>
              )}

              {newLimit.appName && newLimit.appName !== "__custom__" && (
                <div className="flex items-center gap-2 text-sm bg-primary/10 text-primary px-3 py-2 rounded-lg animate-in fade-in duration-200">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Selected: <span className="font-bold">{newLimit.appName}</span>
                </div>
              )}

              <div className="space-y-4 pt-2 border-t">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="minutes">Daily Time Limit</Label>
                    <span className="text-2xl font-bold text-primary tabular-nums">
                        {newLimit.minutes < 60 ? `${newLimit.minutes}m` : `${(newLimit.minutes / 60).toFixed(1).replace('.0', '')}h`}
                    </span>
                  </div>
                  
                  <input 
                        type="range"
                        min="5"
                        max="300"
                        step="5"
                        value={newLimit.minutes}
                        className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                        onChange={(e) => setNewLimit({ ...newLimit, minutes: parseInt(e.target.value) })}
                    />
                    
                  <div className="flex justify-between gap-2">
                    {quickTimeOptions.map((m) => (
                      <Button
                        key={m}
                        type="button"
                        variant={newLimit.minutes === m ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewLimit({ ...newLimit, minutes: m })}
                        className="flex-1 h-8 text-xs"
                      >
                        {m < 60 ? `${m}m` : `${m / 60}h`}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <div className="flex items-center h-5">
                    <input
                        type="checkbox"
                        id="blockWhenExceeded"
                        checked={newLimit.blockWhenExceeded}
                        onChange={(e) =>
                            setNewLimit({
                            ...newLimit,
                            blockWhenExceeded: e.target.checked,
                            })
                        }
                        className="h-4 w-4 rounded border-destructive text-destructive focus:ring-destructive accent-destructive"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="blockWhenExceeded" className="cursor-pointer font-medium text-destructive">
                      Hard Block
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Force quit application when limit is reached.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 pt-2 bg-muted/20 border-t">
              <Button
                type="button"
                variant="ghost"
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
                Set Limit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Limit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the daily usage limit for <strong className="text-foreground">{deleteConfirm}</strong>. 
              You can always add it back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
