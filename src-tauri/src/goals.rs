use chrono::{Datelike, Local, NaiveDate};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A user-defined screen time goal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Goal {
    /// Unique identifier
    pub id: String,
    /// User-friendly name for the goal
    pub name: String,
    /// Type of goal
    pub goal_type: GoalType,
    /// Target value (interpretation depends on goal_type)
    pub target_minutes: i32,
    /// Days this goal applies to (empty = every day)
    pub days: Vec<u8>,
    /// Whether the goal is currently active
    pub enabled: bool,
    /// Date the goal was created
    pub created_at: String,
}

/// Types of goals users can set
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum GoalType {
    /// Total daily screen time limit (e.g., "less than 4 hours total")
    DailyLimit,
    /// Specific app limit (stored with app_name in metadata)
    AppLimit { app_name: String },
    /// Category limit (e.g., "less than 1 hour on social media")
    CategoryLimit { category: String },
    /// Minimum productive time (e.g., "at least 2 hours on Development")
    MinimumProductive { category: String },
}

/// Progress toward a goal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoalProgress {
    pub goal_id: String,
    pub goal_name: String,
    pub goal_type: GoalType,
    pub target_minutes: i32,
    pub current_minutes: i32,
    /// Progress as percentage (0-100+)
    pub progress_percent: i32,
    /// Whether the goal is met
    pub is_met: bool,
    /// Status message for the user
    pub status: GoalStatus,
}

/// Status of goal completion
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum GoalStatus {
    /// On track to meet the goal
    OnTrack,
    /// Warning - approaching limit
    Warning,
    /// Exceeded limit goal
    Exceeded,
    /// Met minimum goal
    Achieved,
    /// Not yet started today
    NotStarted,
}

/// Achievement earned by the user
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Achievement {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub earned_at: Option<String>,
    pub progress: i32,
    pub target: i32,
}

/// Available achievements
pub fn get_available_achievements() -> Vec<Achievement> {
    vec![
        Achievement {
            id: "first_goal".to_string(),
            name: "Goal Setter".to_string(),
            description: "Create your first screen time goal".to_string(),
            icon: "target".to_string(),
            earned_at: None,
            progress: 0,
            target: 1,
        },
        Achievement {
            id: "streak_3".to_string(),
            name: "Getting Started".to_string(),
            description: "Meet all your goals for 3 days in a row".to_string(),
            icon: "flame".to_string(),
            earned_at: None,
            progress: 0,
            target: 3,
        },
        Achievement {
            id: "streak_7".to_string(),
            name: "Week Warrior".to_string(),
            description: "Meet all your goals for 7 days in a row".to_string(),
            icon: "award".to_string(),
            earned_at: None,
            progress: 0,
            target: 7,
        },
        Achievement {
            id: "streak_30".to_string(),
            name: "Monthly Master".to_string(),
            description: "Meet all your goals for 30 days in a row".to_string(),
            icon: "trophy".to_string(),
            earned_at: None,
            progress: 0,
            target: 30,
        },
        Achievement {
            id: "focus_5".to_string(),
            name: "Focus Beginner".to_string(),
            description: "Complete 5 focus sessions".to_string(),
            icon: "brain".to_string(),
            earned_at: None,
            progress: 0,
            target: 5,
        },
        Achievement {
            id: "focus_25".to_string(),
            name: "Focus Expert".to_string(),
            description: "Complete 25 focus sessions".to_string(),
            icon: "sparkles".to_string(),
            earned_at: None,
            progress: 0,
            target: 25,
        },
        Achievement {
            id: "under_limit_10".to_string(),
            name: "Self Control".to_string(),
            description: "Stay under your daily limit 10 times".to_string(),
            icon: "shield".to_string(),
            earned_at: None,
            progress: 0,
            target: 10,
        },
        Achievement {
            id: "productive_week".to_string(),
            name: "Productivity Pro".to_string(),
            description: "Spend 20+ hours on productive apps in a week".to_string(),
            icon: "rocket".to_string(),
            earned_at: None,
            progress: 0,
            target: 1200, // 20 hours in minutes
        },
    ]
}

/// Goals manager state
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GoalsState {
    pub goals: Vec<Goal>,
    pub achievements: HashMap<String, Achievement>,
    pub current_streak: i32,
    pub longest_streak: i32,
    pub total_goals_met: i32,
    pub focus_sessions_completed: i32,
}

impl GoalsState {
    pub fn new() -> Self {
        let achievements: HashMap<String, Achievement> = get_available_achievements()
            .into_iter()
            .map(|a| (a.id.clone(), a))
            .collect();

        Self {
            goals: vec![],
            achievements,
            current_streak: 0,
            longest_streak: 0,
            total_goals_met: 0,
            focus_sessions_completed: 0,
        }
    }

    /// Add a new goal
    pub fn add_goal(&mut self, goal: Goal) {
        // Check for first goal achievement
        if self.goals.is_empty() {
            if let Some(achievement) = self.achievements.get_mut("first_goal") {
                achievement.progress = 1;
                if achievement.earned_at.is_none() {
                    achievement.earned_at = Some(Local::now().format("%Y-%m-%d").to_string());
                }
            }
        }
        self.goals.push(goal);
    }

    /// Remove a goal by ID
    pub fn remove_goal(&mut self, goal_id: &str) {
        self.goals.retain(|g| g.id != goal_id);
    }

    /// Update a goal
    pub fn update_goal(&mut self, goal: Goal) {
        if let Some(existing) = self.goals.iter_mut().find(|g| g.id == goal.id) {
            *existing = goal;
        }
    }

    /// Get goals applicable to a specific day
    pub fn get_goals_for_day(&self, date: NaiveDate) -> Vec<&Goal> {
        let weekday = date.weekday().num_days_from_sunday() as u8;
        self.goals
            .iter()
            .filter(|g| g.enabled && (g.days.is_empty() || g.days.contains(&weekday)))
            .collect()
    }

    /// Record that a focus session was completed
    pub fn record_focus_session(&mut self) {
        self.focus_sessions_completed += 1;

        // Update focus achievements
        if let Some(achievement) = self.achievements.get_mut("focus_5") {
            achievement.progress = self.focus_sessions_completed.min(5);
            if achievement.progress >= 5 && achievement.earned_at.is_none() {
                achievement.earned_at = Some(Local::now().format("%Y-%m-%d").to_string());
            }
        }

        if let Some(achievement) = self.achievements.get_mut("focus_25") {
            achievement.progress = self.focus_sessions_completed.min(25);
            if achievement.progress >= 25 && achievement.earned_at.is_none() {
                achievement.earned_at = Some(Local::now().format("%Y-%m-%d").to_string());
            }
        }
    }

    /// Record that all goals were met for a day
    pub fn record_goals_met(&mut self, all_met: bool) {
        if all_met {
            self.current_streak += 1;
            self.total_goals_met += 1;

            if self.current_streak > self.longest_streak {
                self.longest_streak = self.current_streak;
            }

            // Update streak achievements
            let today = Local::now().format("%Y-%m-%d").to_string();

            if let Some(achievement) = self.achievements.get_mut("streak_3") {
                achievement.progress = self.current_streak.min(3);
                if achievement.progress >= 3 && achievement.earned_at.is_none() {
                    achievement.earned_at = Some(today.clone());
                }
            }

            if let Some(achievement) = self.achievements.get_mut("streak_7") {
                achievement.progress = self.current_streak.min(7);
                if achievement.progress >= 7 && achievement.earned_at.is_none() {
                    achievement.earned_at = Some(today.clone());
                }
            }

            if let Some(achievement) = self.achievements.get_mut("streak_30") {
                achievement.progress = self.current_streak.min(30);
                if achievement.progress >= 30 && achievement.earned_at.is_none() {
                    achievement.earned_at = Some(today.clone());
                }
            }

            // Update under limit achievement
            if let Some(achievement) = self.achievements.get_mut("under_limit_10") {
                achievement.progress = self.total_goals_met.min(10);
                if achievement.progress >= 10 && achievement.earned_at.is_none() {
                    achievement.earned_at = Some(today);
                }
            }
        } else {
            self.current_streak = 0;
        }
    }

    /// Get all achievements with their current progress
    pub fn get_achievements(&self) -> Vec<Achievement> {
        self.achievements.values().cloned().collect()
    }

    /// Get newly earned achievements (for notifications)
    pub fn get_newly_earned(&self) -> Vec<&Achievement> {
        let today = Local::now().format("%Y-%m-%d").to_string();
        self.achievements
            .values()
            .filter(|a| a.earned_at.as_ref() == Some(&today))
            .collect()
    }
}

/// Calculate goal progress based on usage data
pub fn calculate_goal_progress(
    goal: &Goal,
    total_daily_minutes: i32,
    app_usage: &HashMap<String, i32>,
    category_usage: &HashMap<String, i32>,
) -> GoalProgress {
    let (current_minutes, is_limit_goal) = match &goal.goal_type {
        GoalType::DailyLimit => (total_daily_minutes, true),
        GoalType::AppLimit { app_name } => {
            let minutes = app_usage.get(app_name).copied().unwrap_or(0);
            (minutes, true)
        }
        GoalType::CategoryLimit { category } => {
            let minutes = category_usage.get(category).copied().unwrap_or(0);
            (minutes, true)
        }
        GoalType::MinimumProductive { category } => {
            let minutes = category_usage.get(category).copied().unwrap_or(0);
            (minutes, false)
        }
    };

    let progress_percent = if goal.target_minutes > 0 {
        ((current_minutes as f64 / goal.target_minutes as f64) * 100.0) as i32
    } else {
        0
    };

    let (is_met, status) = if is_limit_goal {
        // For limit goals, lower is better
        let is_met = current_minutes <= goal.target_minutes;
        let status = if current_minutes == 0 {
            GoalStatus::NotStarted
        } else if progress_percent >= 100 {
            GoalStatus::Exceeded
        } else if progress_percent >= 80 {
            GoalStatus::Warning
        } else {
            GoalStatus::OnTrack
        };
        (is_met, status)
    } else {
        // For minimum goals, higher is better
        let is_met = current_minutes >= goal.target_minutes;
        let status = if is_met {
            GoalStatus::Achieved
        } else if progress_percent >= 50 {
            GoalStatus::OnTrack
        } else if current_minutes == 0 {
            GoalStatus::NotStarted
        } else {
            GoalStatus::Warning
        };
        (is_met, status)
    };

    GoalProgress {
        goal_id: goal.id.clone(),
        goal_name: goal.name.clone(),
        goal_type: goal.goal_type.clone(),
        target_minutes: goal.target_minutes,
        current_minutes,
        progress_percent,
        is_met,
        status,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_daily_limit_goal_progress() {
        let goal = Goal {
            id: "test".to_string(),
            name: "Daily Limit".to_string(),
            goal_type: GoalType::DailyLimit,
            target_minutes: 240, // 4 hours
            days: vec![],
            enabled: true,
            created_at: "2026-01-13".to_string(),
        };

        let progress = calculate_goal_progress(&goal, 120, &HashMap::new(), &HashMap::new());
        assert_eq!(progress.progress_percent, 50);
        assert!(progress.is_met);
        assert_eq!(progress.status, GoalStatus::OnTrack);
    }

    #[test]
    fn test_daily_limit_exceeded() {
        let goal = Goal {
            id: "test".to_string(),
            name: "Daily Limit".to_string(),
            goal_type: GoalType::DailyLimit,
            target_minutes: 240,
            days: vec![],
            enabled: true,
            created_at: "2026-01-13".to_string(),
        };

        let progress = calculate_goal_progress(&goal, 300, &HashMap::new(), &HashMap::new());
        assert_eq!(progress.progress_percent, 125);
        assert!(!progress.is_met);
        assert_eq!(progress.status, GoalStatus::Exceeded);
    }

    #[test]
    fn test_minimum_productive_goal() {
        let goal = Goal {
            id: "test".to_string(),
            name: "Productive Time".to_string(),
            goal_type: GoalType::MinimumProductive {
                category: "Development".to_string(),
            },
            target_minutes: 120,
            days: vec![],
            enabled: true,
            created_at: "2026-01-13".to_string(),
        };

        let mut category_usage = HashMap::new();
        category_usage.insert("Development".to_string(), 150);

        let progress = calculate_goal_progress(&goal, 300, &HashMap::new(), &category_usage);
        assert_eq!(progress.progress_percent, 125);
        assert!(progress.is_met);
        assert_eq!(progress.status, GoalStatus::Achieved);
    }

    #[test]
    fn test_goals_state_streak() {
        let mut state = GoalsState::new();
        state.record_goals_met(true);
        assert_eq!(state.current_streak, 1);

        state.record_goals_met(true);
        assert_eq!(state.current_streak, 2);

        state.record_goals_met(false);
        assert_eq!(state.current_streak, 0);
        assert_eq!(state.longest_streak, 2);
    }

    #[test]
    fn test_first_goal_achievement() {
        let mut state = GoalsState::new();
        assert!(state
            .achievements
            .get("first_goal")
            .unwrap()
            .earned_at
            .is_none());

        state.add_goal(Goal {
            id: "g1".to_string(),
            name: "Test".to_string(),
            goal_type: GoalType::DailyLimit,
            target_minutes: 240,
            days: vec![],
            enabled: true,
            created_at: "2026-01-13".to_string(),
        });

        assert!(state
            .achievements
            .get("first_goal")
            .unwrap()
            .earned_at
            .is_some());
    }
}
