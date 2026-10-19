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

// Course / Learning types
export interface Course {
  id: string
  title: string
  description: string
  subject: string
  progress?: number
  enrolled?: boolean
  completed?: boolean
  created_at?: string
}

export interface Lesson {
  id: string
  title: string
  content: string
  duration_minutes?: number
  order: number
  completed?: boolean
}

export interface Module {
  id: string
  title: string
  description?: string
  order: number
  course_id?: string
  created_at?: string
  lessons?: Lesson[]
}

// Quiz types
export interface QuestionOption {
  id: string
  text: string
  index: number
}

export interface Question {
  id: string
  text: string
  options: QuestionOption[]
  difficulty?: string
  subject?: string
}

export interface Feedback {
  correct: boolean
  explanation: string
  correct_answer_index?: number
  correct_answer?: string
  ai_prediction?: number
  ai_confidence?: number
  confidence_score?: number
}

export interface Quiz {
  id: string
  _id?: string
  title: string
  description: string
  difficulty: string
  topic?: string
  questions?: Question[]
  generated_by?: string
  created_at: string
  total_points: number
  recent_performance?: {
    score: number
    attempts: number
    last_played?: string
  }
}

// Adaptive quiz API contracts
export interface TestStartRequest {
  subject: string
}

export interface TestStartResponse {
  session_id: string
  question: Question
  question_number: number
  total_questions: number
}

export interface TestAnswerRequest {
  session_id: string
  question_id: string
  answer: number
}

export interface TestAnswerResponse {
  feedback: Feedback
  next_question: Question | null
  test_completed: boolean
  final_score?: number
}

// Coding types
export interface CodingProblem {
  id: string
  title: string
  description: string
  difficulty: string
  language: string
  category?: string
  starter_code?: string
  initial_code?: Record<string, string>
  test_cases?: Array<{ input: string; expected_output: string }>
  solved?: boolean
}

export interface CodeExecutionResult {
  success: boolean
  correct?: boolean
  output?: string
  error?: string
  runtime?: number
  test_results?: Array<{ passed: boolean; input: string; expected: string; actual: string }>
  score?: number
}
