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
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Flame className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.current_streak}</p>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.longest_streak}</p>
                  <p className="text-sm text-muted-foreground">Best Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_goals_met}</p>
                  <p className="text-sm text-muted-foreground">Goals Met</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Brain className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats.focus_sessions_completed}
                  </p>
                  <p className="text-sm text-muted-foreground">Focus Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Today's Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Today's Progress
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddGoal(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Goal
          </Button>
        </CardHeader>
        <CardContent>
          {progress.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No goals set for today.</p>
              <p className="text-sm mt-1">
                Create a goal to start tracking your screen time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {progress.map((p) => (
                <div
                  key={p.goal_id}
                  className="p-4 rounded-lg border bg-card space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(p.status)}
                      <div>
                        <p className="font-medium">{p.goal_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {getGoalTypeLabel(p.goal_type)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatMinutes(p.current_minutes)} /{" "}
                        {formatMinutes(p.target_minutes)}
                      </p>
                      <Badge
                        variant={p.is_met ? "default" : "secondary"}
                        className="mt-1"
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Your Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No goals configured yet.
            </p>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{goal.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {getGoalTypeLabel(goal.goal_type)} •{" "}
                      {formatMinutes(goal.target_minutes)}
                      {goal.days.length > 0 && (
                        <span className="ml-2">
                          ({goal.days.map((d) => DAYS_OF_WEEK[d].label).join(", ")}
                          )
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveGoal(goal.id)}
                    className="text-destructive hover:text-destructive"
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {earnedAchievements.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                Earned ({earnedAchievements.length})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {earnedAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="p-4 rounded-lg border bg-primary/5 border-primary/20 text-center"
                  >
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2 text-primary">
                      {ACHIEVEMENT_ICONS[achievement.icon] || (
                        <Award className="h-6 w-6" />
                      )}
                    </div>
                    <p className="font-medium text-sm">{achievement.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {achievement.description}
                    </p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {achievement.earned_at}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">
              Locked ({unlockedAchievements.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {unlockedAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-4 rounded-lg border bg-muted/30 text-center opacity-60"
                >
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2 text-muted-foreground">
                    {ACHIEVEMENT_ICONS[achievement.icon] || (
                      <Award className="h-6 w-6" />
                    )}
                  </div>
                  <p className="font-medium text-sm">{achievement.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {achievement.description}
                  </p>
                  <Progress
                    value={(achievement.progress / achievement.target) * 100}
                    className="mt-2 h-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Goal Name</Label>
              <Input
                placeholder="e.g., Limit daily screen time"
                value={newGoal.name}
                onChange={(e) =>
                  setNewGoal({ ...newGoal, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Goal Type</Label>
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
              <div className="space-y-2">
                <Label>App Name</Label>
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
              <div className="space-y-2">
                <Label>Category</Label>
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

            <div className="space-y-2">
              <Label>
                Target (minutes):{" "}
                <span className="font-normal text-muted-foreground">
                  {formatMinutes(newGoal.targetMinutes)}
                </span>
              </Label>
              <Input
                type="number"
                min={1}
                max={1440}
                value={newGoal.targetMinutes}
                onChange={(e) =>
                  setNewGoal({
                    ...newGoal,
                    targetMinutes: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Active Days (leave empty for every day)</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    variant={
                      newGoal.days.includes(day.value) ? "default" : "outline"
                    }
                    size="sm"
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
          <DialogFooter>
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
