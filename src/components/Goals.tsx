import { useState, useEffect } from "react";
import {
  Target,
  Plus,
  Trash2,
  Trophy,
  Flame,
  Award,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  Sparkles,
  Shield,
  Rocket,
  Brain,
} from "lucide-react";
import { api } from "@/services/api";
import type {
  Goal,
  GoalProgress,
  GoalType,
  Achievement,
  GoalsStats,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { APP_CATEGORIES } from "@/types";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  target: <Target className="h-6 w-6" />,
  flame: <Flame className="h-6 w-6" />,
  award: <Award className="h-6 w-6" />,
  trophy: <Trophy className="h-6 w-6" />,
  brain: <Brain className="h-6 w-6" />,
  sparkles: <Sparkles className="h-6 w-6" />,
  shield: <Shield className="h-6 w-6" />,
  rocket: <Rocket className="h-6 w-6" />,
};

type GoalTypeKey = "daily_limit" | "app_limit" | "category_limit" | "minimum_productive";

export const Goals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [progress, setProgress] = useState<GoalProgress[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<GoalsStats | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState<{
    name: string;
    goalType: GoalTypeKey;
    targetMinutes: number;
    days: number[];
    appName: string;
    category: string;
  }>({
    name: "",
    goalType: "daily_limit",
    targetMinutes: 240,
    days: [],
    appName: "",
    category: "Productivity",
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadProgress, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [goalsData, progressData, achievementsData, statsData] =
        await Promise.all([
          api.getGoals(),
          api.getGoalsProgress(),
          api.getAchievements(),
          api.getGoalsStats(),
        ]);
      setGoals(goalsData);
      setProgress(progressData);
      setAchievements(achievementsData);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load goals data:", error);
    }
  };

  const loadProgress = async () => {
    try {
      const progressData = await api.getGoalsProgress();
      setProgress(progressData);
    } catch (error) {
      console.error("Failed to load progress:", error);
    }
  };

  const handleAddGoal = async () => {
    if (!newGoal.name.trim()) {
      toast.error("Please enter a goal name");
      return;
    }

    let goalType: GoalType;
    switch (newGoal.goalType) {
      case "daily_limit":
        goalType = { daily_limit: {} };
        break;
      case "app_limit":
        if (!newGoal.appName.trim()) {
          toast.error("Please enter an app name");
          return;
        }
        goalType = { app_limit: { app_name: newGoal.appName } };
        break;
      case "category_limit":
        goalType = { category_limit: { category: newGoal.category } };
        break;
      case "minimum_productive":
        goalType = { minimum_productive: { category: newGoal.category } };
        break;
    }

    const goal: Goal = {
      id: crypto.randomUUID(),
      name: newGoal.name,
      goal_type: goalType,
      target_minutes: newGoal.targetMinutes,
      days: newGoal.days,
      enabled: true,
      created_at: new Date().toISOString().split("T")[0],
    };

    try {
      await api.addGoal(goal);
      setGoals([...goals, goal]);
      setShowAddGoal(false);
      setNewGoal({
        name: "",
        goalType: "daily_limit",
        targetMinutes: 240,
        days: [],
        appName: "",
        category: "Productivity",
      });
      toast.success("Goal created!");
      loadProgress();
    } catch (error) {
      toast.error("Failed to create goal");
      console.error(error);
    }
  };

  const handleRemoveGoal = async (goalId: string) => {
    try {
      await api.removeGoal(goalId);
      setGoals(goals.filter((g) => g.id !== goalId));
      toast.success("Goal removed");
      loadProgress();
    } catch (error) {
      toast.error("Failed to remove goal");
      console.error(error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "on_track":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "exceeded":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "achieved":
        return <Trophy className="h-5 w-5 text-green-500" />;
      case "not_started":
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on_track":
      case "achieved":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "exceeded":
        return "bg-red-500";
      default:
        return "bg-muted";
    }
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getGoalTypeLabel = (goalType: GoalType): string => {
    if ("daily_limit" in goalType) return "Daily Limit";
    if ("app_limit" in goalType) return `App: ${goalType.app_limit.app_name}`;
    if ("category_limit" in goalType)
      return `Category: ${goalType.category_limit.category}`;
    if ("minimum_productive" in goalType)
      return `Min. Productive: ${goalType.minimum_productive.category}`;
    return "Unknown";
  };

  const earnedAchievements = achievements.filter((a) => a.earned_at);
  const unlockedAchievements = achievements.filter((a) => !a.earned_at);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight">Goals</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Set targets and track your digital wellness journey
          </p>
        </div>
        <Button onClick={() => setShowAddGoal(true)} className="self-start sm:self-auto gap-2 shadow-lg hover:shadow-xl transition-all">
          <Plus className="h-4 w-4" />
          New Goal
        </Button>
      </header>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="hover:shadow-lg transition-all hover:border-orange-500/30 group">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
                  <Flame className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{stats.current_streak}</p>
                  <p className="text-xs text-muted-foreground">Current Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all hover:border-yellow-500/30 group">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-yellow-500/20 group-hover:scale-105 transition-transform">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{stats.longest_streak}</p>
                  <p className="text-xs text-muted-foreground">Best Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all hover:border-green-500/30 group">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-green-500/20 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{stats.total_goals_met}</p>
                  <p className="text-xs text-muted-foreground">Goals Met</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all hover:border-purple-500/30 group">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{stats.focus_sessions_completed}</p>
                  <p className="text-xs text-muted-foreground">Focus Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Today's Progress */}
      <Card className="border-border/50 hover:shadow-lg transition-all">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            Today's Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {progress.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <div className="h-16 w-16 mx-auto mb-4 bg-muted/50 rounded-full flex items-center justify-center">
                <Target className="h-8 w-8 opacity-50" />
              </div>
              <p className="font-medium">No goals set for today</p>
              <p className="text-sm mt-1">
                Create a goal to start tracking your screen time.
              </p>
              <Button onClick={() => setShowAddGoal(true)} variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Goal
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {progress.map((p) => (
                <div
                  key={p.goal_id}
                  className="p-3 sm:p-4 rounded-xl border border-border/50 bg-card space-y-3 hover:shadow-md transition-all hover:border-primary/20"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {getStatusIcon(p.status)}
                      <div className="min-w-0">
                        <p className="font-medium truncate text-sm sm:text-base">{p.goal_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {getGoalTypeLabel(p.goal_type)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium text-sm sm:text-base">
                        {formatMinutes(p.current_minutes)} /{" "}
                        {formatMinutes(p.target_minutes)}
                      </p>
                      <Badge
                        variant={p.is_met ? "default" : "secondary"}
                        className="mt-1 text-xs"
                      >
                        {p.is_met ? "Goal Met!" : `${p.progress_percent}%`}
                      </Badge>
                    </div>
                  </div>
                  <Progress
                    value={Math.min(p.progress_percent, 100)}
                    className={cn("h-2", getStatusColor(p.status))}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Goals */}
      <Card className="border-border/50 hover:shadow-lg transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
              <Target className="h-4 w-4 text-white" />
            </div>
            Your Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">
              No goals configured yet. Create one to get started!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{goal.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {getGoalTypeLabel(goal.goal_type)} •{" "}
                      {formatMinutes(goal.target_minutes)}
                      {goal.days.length > 0 && goal.days.length < 7 && (
                        <span className="ml-1">
                          ({goal.days.map((d) => DAYS_OF_WEEK[d].label).join(", ")})
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveGoal(goal.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="border-border/50 hover:shadow-lg transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
              <Award className="h-4 w-4 text-white" />
            </div>
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {earnedAchievements.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-medium mb-3 text-muted-foreground uppercase tracking-wider">
                Earned ({earnedAchievements.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {earnedAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="p-3 sm:p-4 rounded-xl border border-primary/20 bg-primary/5 text-center hover:shadow-md transition-all hover:scale-[1.02]"
                  >
                    <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center mb-2 text-white shadow-lg shadow-primary/20">
                      {ACHIEVEMENT_ICONS[achievement.icon] || (
                        <Award className="h-5 w-5 sm:h-6 sm:w-6" />
                      )}
                    </div>
                    <p className="font-medium text-xs sm:text-sm truncate">{achievement.name}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">
                      {achievement.description}
                    </p>
                    <Badge variant="outline" className="mt-2 text-[10px] sm:text-xs">
                      {achievement.earned_at}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-medium mb-3 text-muted-foreground uppercase tracking-wider">
              Locked ({unlockedAchievements.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {unlockedAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-3 sm:p-4 rounded-xl border border-border/50 bg-muted/20 text-center opacity-60 hover:opacity-80 transition-opacity"
                >
                  <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted flex items-center justify-center mb-2 text-muted-foreground">
                    {ACHIEVEMENT_ICONS[achievement.icon] || (
                      <Award className="h-5 w-5 sm:h-6 sm:w-6" />
                    )}
                  </div>
                  <p className="font-medium text-xs sm:text-sm truncate">{achievement.name}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">
                    {achievement.description}
                  </p>
                  <Progress
                    value={(achievement.progress / achievement.target) * 100}
                    className="mt-2 h-1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {achievement.progress} / {achievement.target}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Goal Dialog */}
      <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading">Create New Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Goal Name</Label>
              <Input
                placeholder="e.g., Limit daily screen time"
                value={newGoal.name}
                onChange={(e) =>
                  setNewGoal({ ...newGoal, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Goal Type</Label>
              <Select
                value={newGoal.goalType}
                onValueChange={(value: GoalTypeKey) =>
                  setNewGoal({ ...newGoal, goalType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily_limit">
                    Daily Screen Time Limit
                  </SelectItem>
                  <SelectItem value="app_limit">Specific App Limit</SelectItem>
                  <SelectItem value="category_limit">Category Limit</SelectItem>
                  <SelectItem value="minimum_productive">
                    Minimum Productive Time
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newGoal.goalType === "app_limit" && (
              <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                <Label className="text-xs font-medium">App Name</Label>
                <Input
                  placeholder="e.g., Firefox"
                  value={newGoal.appName}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, appName: e.target.value })
                  }
                />
              </div>
            )}

            {(newGoal.goalType === "category_limit" ||
              newGoal.goalType === "minimum_productive") && (
              <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                <Label className="text-xs font-medium">Category</Label>
                <Select
                  value={newGoal.category}
                  onValueChange={(value) =>
                    setNewGoal({ ...newGoal, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APP_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-medium">Target Time</Label>
                <span className="text-lg font-bold text-primary">
                  {formatMinutes(newGoal.targetMinutes)}
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={480}
                step={15}
                value={newGoal.targetMinutes}
                onChange={(e) =>
                  setNewGoal({
                    ...newGoal,
                    targetMinutes: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>15m</span>
                <span>4h</span>
                <span>8h</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Active Days (leave empty for every day)</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    variant={
                      newGoal.days.includes(day.value) ? "default" : "outline"
                    }
                    size="sm"
                    className="h-8 w-10 text-xs"
                    onClick={() => {
                      const newDays = newGoal.days.includes(day.value)
                        ? newGoal.days.filter((d) => d !== day.value)
                        : [...newGoal.days, day.value];
                      setNewGoal({ ...newGoal, days: newDays });
                    }}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAddGoal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddGoal}>Create Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
