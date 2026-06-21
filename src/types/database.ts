export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  location: string | null;
  sustainability_score: number;
  streak: number;
  trees_planted: number;
  rank: number | null;
  role: string;
  xp_points: number;
  level: number;
  created_at: string;
}

export interface CarbonProfile {
  id: string;
  transportation_type: string;
  weekly_distance: number;
  energy_type: string;
  food_diet: string;
  shopping_frequency: string;
  waste_recycling: string;
  created_at: string;
  updated_at: string;
}

export interface FootprintRecord {
  id: string;
  user_id: string;
  record_date: string;
  transport_emissions: number;
  energy_emissions: number;
  food_emissions: number;
  shopping_emissions: number;
  waste_emissions: number;
  total_emissions: number;
  notes: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  category: string;
  target_value: number;
  progress_value: number;
  status: "active" | "completed" | "archived";
  deadline: string | null;
  icon: string;
  created_at: string;
}

export interface GoalProgress {
  id: string;
  goal_id: string;
  value_changed: number;
  recorded_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  xp: number;
  icon: string;
  category: string | null;
  duration: string | null;
  required_days?: number;
  is_archived?: boolean;
  created_at: string;
}

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  progress: number;
  status: "joined" | "completed" | "abandoned";
  joined_at: string;
  completed_at: string | null;
  challenge?: Challenge; // Joined challenge
}

export interface Achievement {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  key: string;
  xp_reward?: number;
  is_archived?: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: Achievement; // Joined achievement
}

export interface Simulation {
  id: string;
  user_id: string;
  scenario_data: Record<string, any>;
  annual_savings: number;
  percentage_reduction: number;
  created_at: string;
}

export interface AiConversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "info" | "tip";
  icon: string;
  is_read: boolean;
  created_at: string;
}

export interface LeaderboardSnapshot {
  id: string;
  snapshot_date: string;
  data: Record<string, any>;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  xp_earned: number;
  carbon_saved: number;
  icon: string;
  created_at: string;
}
