'use client'
import React, { useState } from 'react'
import { Brain, Target, TrendingUp, ChevronRight, CheckCircle, XCircle, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Question {
  question_id: string
  question_text: string
  choices: { A: string; B: string; C: string; D: string }
  correct_answer: string
  difficulty: string
  category: string
}

interface SessionStats {
  session_id: string
  current_difficulty: string
  total_questions: number
  total_correct: number
  overall_accuracy: number
  consecutive_correct: { easy: number; medium: number; hard: number }
  difficulty_breakdown: { [key: string]: { questions: number; correct: number; accuracy: number } }
  model_available: boolean
}

export default function AdaptiveQuizPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const [showPrediction, setShowPrediction] = useState(false)
  const [aiPrediction, setAIPrediction] = useState<any>(null)

  const startQuiz = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://127.0.0.1:5000/api/adaptive-quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: `user_${Date.now()}` }),
      })
      const data = await response.json()
      if (data.success) {
        setSessionId(data.session_id)
        setCurrentQuestion(data.question)
        setSessionStats(data.session_stats)
        setQuizStarted(true)
      } else {
        alert(`Failed to start quiz: ${data.error}`)
      }
    } catch {
      alert('Network error: Could not start quiz')
    } finally {
      setLoading(false)
    }
  }

  const submitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion || !sessionId) return
    setLoading(true)
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/adaptive-quiz/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: selectedAnswer, question_data: currentQuestion }),
      })
      const data = await response.json()
      if (data.success) {
        setLastResult(data.result)
        if (data.quiz_completed) {
          setQuizCompleted(true)
          setSessionStats(data.final_stats)
        } else {
          setCurrentQuestion(data.next_question)
          setSessionStats(data.session_stats)
        }
        setSelectedAnswer('')
        setShowPrediction(false)
        setAIPrediction(null)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('Network error: Could not submit answer')
    } finally {
      setLoading(false)
    }
  }

  const getAIPrediction = async () => {
    if (!currentQuestion) return
    try {
      const response = await fetch('http://127.0.0.1:5000/api/adaptive-quiz/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_text: currentQuestion.question_text, choices: currentQuestion.choices }),
      })
      const data = await response.json()
      if (data.success) {
        setAIPrediction(data.prediction)
        setShowPrediction(true)
      }
    } catch {
      console.error('Failed to get AI prediction')
    }
  }

  const difficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
      case 'hard': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  // Start screen
  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary mb-4">
              <Brain className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Adaptive AI Quiz</h1>
            <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
              An intelligent quiz that adapts to your skill level in real-time using our trained CNN model.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon: Target, label: 'Adaptive Difficulty', desc: 'Questions adjust based on your performance' },
              { icon: Brain, label: 'AI Predictions', desc: 'See how our AI model would answer' },
              { icon: TrendingUp, label: 'Smart Analytics', desc: 'Track performance across difficulty levels' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <Icon className="h-5 w-5 text-primary" />
                <p className="font-medium text-card-foreground text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button onClick={startQuiz} disabled={loading} size="lg" className="gap-2">
              {loading ? (
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              Start Adaptive Quiz
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Completed screen
  if (quizCompleted) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-3xl mx-auto py-10">
          <div className="text-center mb-8">
            <Trophy className="h-12 w-12 text-amber-500 mx-auto mb-3" />
            <h1 className="text-3xl font-bold text-foreground">Quiz Complete</h1>
            <p className="mt-1 text-muted-foreground">Here are your results</p>
          </div>

          {sessionStats && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Questions', value: sessionStats.total_questions, color: 'text-primary' },
                  { label: 'Overall Accuracy', value: `${sessionStats.overall_accuracy}%`, color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Final Level', value: sessionStats.current_difficulty, color: 'text-amber-600 dark:text-amber-400' },
                  { label: 'Correct', value: `${sessionStats.total_correct}/${sessionStats.total_questions}`, color: 'text-primary' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border bg-card p-5 mb-6">
                <h3 className="font-semibold text-card-foreground mb-4">Performance by Difficulty</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Object.entries(sessionStats.difficulty_breakdown).map(([difficulty, stats]) => (
                    <div key={difficulty} className="rounded-lg border border-border bg-muted/30 p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${difficultyBadge(difficulty)}`}>
                        {difficulty}
                      </span>
                      <p className="text-xl font-bold text-foreground mt-2">{stats.accuracy}%</p>
                      <p className="text-xs text-muted-foreground">{stats.correct}/{stats.questions} questions</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="text-center">
            <Button onClick={() => {
              setQuizStarted(false)
              setQuizCompleted(false)
              setSessionId(null)
              setCurrentQuestion(null)
              setSessionStats(null)
              setLastResult(null)
            }}>
              Take Another Quiz
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Active quiz
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto py-6 space-y-5">
        {/* Stats bar */}
        {sessionStats && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-primary">{sessionStats.total_questions}</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{sessionStats.overall_accuracy}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              <div>
                <p className={`text-lg font-bold capitalize ${difficultyBadge(sessionStats.current_difficulty).split(' ')[0]}`}>
                  {sessionStats.current_difficulty}
                </p>
                <p className="text-xs text-muted-foreground">Level</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {sessionStats.consecutive_correct[sessionStats.current_difficulty as keyof typeof sessionStats.consecutive_correct] || 0}
                </p>
                <p className="text-xs text-muted-foreground">Streak</p>
              </div>
              <div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${sessionStats.model_available ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                  {sessionStats.model_available ? 'AI Active' : 'Fallback'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Last result */}
        {lastResult && (
          <div className={`rounded-xl border p-4 ${lastResult.is_correct ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {lastResult.is_correct
                  ? <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  : <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
                <span className="font-medium text-foreground">
                  {lastResult.is_correct ? 'Correct' : 'Incorrect'}
                </span>
              </div>
              {lastResult.difficulty_changed && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                  {lastResult.previous_difficulty} → {lastResult.new_difficulty}
                </span>
              )}
            </div>
            {lastResult.explanation && (
              <p className="text-sm text-muted-foreground mt-2">{lastResult.explanation}</p>
            )}
          </div>
        )}

        {/* Question */}
        {currentQuestion && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${difficultyBadge(currentQuestion.difficulty)}`}>
                    {currentQuestion.difficulty}
                  </span>
                  <span className="text-xs text-muted-foreground">{currentQuestion.category}</span>
                </div>
                <h2 className="text-lg font-semibold text-card-foreground leading-snug">
                  {currentQuestion.question_text}
                </h2>
              </div>
              <Button onClick={getAIPrediction} variant="outline" size="sm" className="shrink-0 gap-1.5">
                <Brain className="h-4 w-4" />
                AI Hint
              </Button>
            </div>

            {showPrediction && aiPrediction && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  AI suggests: <strong>{aiPrediction.llm_prediction}</strong>
                </p>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Confidence: {(aiPrediction.confidence * 100).toFixed(1)}%</span>
                  <span>{aiPrediction.fallback_mode ? 'Fallback mode' : 'CNN model'}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {Object.entries(currentQuestion.choices).map(([letter, text]) => (
                <button
                  key={letter}
                  onClick={() => setSelectedAnswer(letter)}
                  className={`w-full p-3.5 text-left rounded-lg border-2 transition-colors text-sm ${
                    selectedAnswer === letter
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-background hover:border-primary/40 hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                      selectedAnswer === letter ? 'border-primary text-primary' : 'border-border text-muted-foreground'
                    }`}>
                      {letter}
                    </span>
                    <span>{text}</span>
                  </div>
                </button>
              ))}
            </div>

            <Button
              onClick={submitAnswer}
              disabled={!selectedAnswer || loading}
              className="w-full gap-2"
              size="lg"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Submit Answer <ChevronRight className="h-4 w-4" /></>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
