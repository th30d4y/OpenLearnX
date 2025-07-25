export interface AuthNonceRequest {
  wallet_address: string
}

export interface AuthNonceResponse {
  nonce: string
  message: string
}

export interface AuthVerifyRequest {
  wallet_address: string
  signature: string
  message: string
}

export interface AuthVerifyResponse {
  success: boolean
  token: string
  user: {
    wallet_address: string
    // Add other user details if available from your backend
  }
}

export interface QuestionOption {
  id: string
  text: string
}

export interface Question {
  id: string
  text: string
  options: QuestionOption[]
  type: string // e.g., "multiple_choice"
}

export interface TestStartRequest {
  subject: string
}

export interface TestStartResponse {
  session_id: string
  question: Question
  question_number: number
  total_questions: number
}

export interface Feedback {
  correct: boolean
  confidence_score: number
  explanation: string
  correct_answer?: string // Optional, if backend provides it
}

export interface TestAnswerRequest {
  session_id: string
  question_id: string
  answer: number // Index of the selected option
}

export interface TestAnswerResponse {
  feedback: Feedback
  next_question: Question | null
  test_completed: boolean
}

export interface User {
  wallet_address: string
  // Add other user details
}

// New types for Course Platform
export interface Lesson {
  id: string
  title: string
  type: "video" | "text" | "code" | "quiz"
  content: string // URL for video, markdown for text, code snippet for code
  completed: boolean
}

export interface Module {
  id: string
  title: string
  lessons: Lesson[]
}

export interface Course {
  id: string
  title: string
  subject: string
  description: string
  progress: number // 0-100
  modules: Module[]
}

// New types for Coding Platform
export interface CodingProblem {
  id: string
  title: string
  category: string
  difficulty: "Easy" | "Medium" | "Hard"
  description: string
  initial_code: { [key: string]: string } // e.g., { "python": "def solve():\n  pass" }
  test_cases: { input: string; expected_output: string }[]
  solved: boolean
}

export interface CodeExecutionResult {
  output: string
  error: string | null
  runtime: number
  correct: boolean
}

// New types for Quiz Platform (reusing existing Test types)
export interface Quiz {
  id: string
  title: string
  topic: string
  difficulty: "Easy" | "Medium" | "Hard"
  recent_performance?: number // 0-100
}

export interface QuizResult {
  score: number
  total_questions: number
  correct_answers: number
  per_question_breakdown: {
    question_id: string
    correct: boolean
    explanation: string
    user_answer: string
    correct_answer: string
  }[]
}

// New types for Dashboard
export interface DashboardStats {
  total_xp: number
  courses_in_progress: number
  courses_completed: number
  coding_problems_solved: number
  quiz_accuracy: number // overall average
  coding_streak: number
}

export interface ActivityData {
  date: string // YYYY-MM-DD
  count: number // Number of activities
}
