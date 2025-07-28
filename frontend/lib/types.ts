// User types
export interface User {
  id: string
  wallet_address: string
  created_at: string
  last_login: string
}

// Authentication request/response types
export interface AuthNonceRequest {
  wallet_address: string
}

export interface AuthNonceResponse {
  success: boolean
  nonce: string
  message: string
  timestamp: string
}

export interface AuthVerifyRequest {
  wallet_address: string
  signature: string
  message: string
}

export interface AuthVerifyResponse {
  success: boolean
  token: string
  user: User
  message: string
}

// Dashboard types
export interface UserProfile {
  user_id: string
  wallet_address?: string
  display_name?: string
  username_set?: boolean
  avatar_url?: string
  created_at?: string
}

export interface DashboardStats {
  total_xp: number
  courses_completed: number
  coding_problems_solved: number
  quiz_accuracy: number
  coding_streak: number
  longest_streak: number
  total_courses: number
  total_quizzes: number
  global_rank: number
  weekly_activity: number[]
  monthly_goals: {
    target: number
    completed: number
  }
  blockchain: {
    wallet_connected: boolean
    wallet_address: string | null
    total_earned: number
    transactions: number
    certificates: number
    verified_achievements: number
  }
  learning_analytics: {
    time_spent_hours: number
    average_session_minutes: number
    completion_rate: number
    favorite_topics: string[]
    skill_levels: {
      [key: string]: number
    }
  }
  recent_achievements: Achievement[]
}

export interface Achievement {
  id: string
  title: string
  description: string
  earned_at: string
  points: number
  rarity: string
}

export interface ActivityData {
  id: string
  type: string
  title: string
  description: string
  completed_at: string
  points_earned: number
  success_rate: number
  difficulty: string
  blockchain_verified: boolean
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  username: string
  display_name?: string
  total_xp: number
  streak: number
  avatar: string
  badges: string[]
  wallet_address?: string
}
