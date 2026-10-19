'use client'
import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Brain, Trophy, ArrowRight, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Question {
  question_id: string
  question_text: string
  options: string[]
  correct_answer: string
  difficulty: string
  points: number
  explanation: string
}

interface SessionStats {
  current_difficulty?: string
  consecutive_correct?: { easy: number; medium: number; hard: number }
  total_questions?: number
  correct_answers?: number
  score?: number
  accuracy?: number
}

export default function QuizPlayPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    current_difficulty: 'easy',
    consecutive_correct: { easy: 0, medium: 0, hard: 0 },
    total_questions: 0,
    correct_answers: 0,
    score: 0,
    accuracy: 0,
  })
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [showResult, setShowResult] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [quizCompleted, setQuizCompleted] = useState(false)

  const getCurrentDifficulty = () => sessionStats?.current_difficulty || 'easy'

  const fetchNextQuestion = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('openlearnx_jwt_token') || localStorage.getItem('openlearnx_token')
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/session/${sessionId}/next-question`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      const data = await response.json()
      if (data.success) {
        if (data.quiz_completed) {
          setQuizCompleted(true)
          setCurrentQuestion(null)
        } else {
          setCurrentQuestion(data.question)
          setSessionStats(prev => ({
            current_difficulty: data.session_stats?.current_difficulty || prev.current_difficulty || 'easy',
            consecutive_correct: data.session_stats?.consecutive_correct || prev.consecutive_correct || { easy: 0, medium: 0, hard: 0 },
            total_questions: data.session_stats?.total_questions || prev.total_questions || 0,
            correct_answers: data.session_stats?.correct_answers || prev.correct_answers || 0,
            score: data.session_stats?.score || prev.score || 0,
            accuracy: data.session_stats?.accuracy || prev.accuracy || 0,
          }))
        }
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('Failed to fetch next question')
    } finally {
      setLoading(false)
    }
  }

  const submitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion) return
    try {
      setLoading(true)
      const token = localStorage.getItem('openlearnx_jwt_token') || localStorage.getItem('openlearnx_token')
      const storedUser = JSON.parse(localStorage.getItem('openlearnx_user') || 'null')
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/session/${sessionId}/submit-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ answer: selectedAnswer, question_data: currentQuestion, user_id: storedUser?.id, wallet_address: storedUser?.wallet_address }),
      })
      const data = await response.json()
      if (data.success) {
        setLastResult(data)
        setShowResult(true)
        setSessionStats(prev => ({
          current_difficulty: data.session_stats?.current_difficulty || prev.current_difficulty || 'easy',
          consecutive_correct: data.session_stats?.consecutive_correct || prev.consecutive_correct || { easy: 0, medium: 0, hard: 0 },
          total_questions: data.session_stats?.total_questions || prev.total_questions || 0,
          correct_answers: data.session_stats?.correct_answers || prev.correct_answers || 0,
          score: data.session_stats?.score || prev.score || 0,
          accuracy: data.session_stats?.accuracy || prev.accuracy || 0,
        }))
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('Failed to submit answer')
    } finally {
      setLoading(false)
    }
  }

  const continueToNext = () => {
    setShowResult(false)
    setSelectedAnswer('')
    setLastResult(null)
    fetchNextQuestion()
  }

  useEffect(() => {
    if (sessionId) fetchNextQuestion()
  }, [sessionId])

  const difficultyBadge = (d: string) => {
    switch (d) {
      case 'easy': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
      case 'hard': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  if (loading && !currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading question…</p>
        </div>
      </div>
    )
  }

  if (quizCompleted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <Trophy className="h-12 w-12 text-amber-500 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-foreground">Quiz Completed</h1>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 mb-6">
            <h2 className="font-semibold text-card-foreground mb-4">Final Results</h2>
            <div className="grid grid-cols-2 gap-4 text-center">
              {[
                { label: 'Final Score', value: sessionStats.score || 0, color: 'text-primary' },
                { label: 'Accuracy', value: `${sessionStats.accuracy || 0}%`, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Questions', value: sessionStats.total_questions || 0, color: 'text-foreground' },
                { label: 'Final Level', value: getCurrentDifficulty(), color: '' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className={`text-xl font-bold capitalize ${color || difficultyBadge(String(value)).split(' ')[0]}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <Button onClick={() => router.push('/quizzes')} className="w-full">Back to Quizzes</Button>
        </div>
      </div>
    )
  }

  if (showResult && lastResult) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4">
          <div className="text-center">
            {lastResult.is_correct
              ? <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
              : <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />}
            <h1 className="text-2xl font-bold text-foreground">{lastResult.is_correct ? 'Correct' : 'Incorrect'}</h1>
            <p className="text-sm text-muted-foreground mt-1">{lastResult.is_correct ? 'Great job!' : 'Keep trying!'}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Correct Answer</p>
              <p className="text-emerald-600 dark:text-emerald-400 font-medium mt-1">{lastResult.correct_answer}</p>
            </div>
            {lastResult.explanation && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Explanation</p>
                <p className="text-sm text-foreground mt-1">{lastResult.explanation}</p>
              </div>
            )}
          </div>

          {lastResult.difficulty_changed && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium text-foreground">Difficulty updated</p>
              <p className="text-sm text-muted-foreground mt-1">
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize ${difficultyBadge(lastResult.previous_difficulty)}`}>{lastResult.previous_difficulty}</span>
                {' → '}
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize ${difficultyBadge(lastResult.new_difficulty)}`}>{lastResult.new_difficulty}</span>
              </p>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Your Progress</p>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-primary">{sessionStats.score || 0}</p>
                <p className="text-xs text-muted-foreground">Score</p>
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{sessionStats.accuracy || 0}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
            </div>
          </div>

          {lastResult.ai_feedback && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium text-foreground flex items-center gap-2 mb-1">
                <Brain className="h-4 w-4 text-primary" /> AI Analysis
              </p>
              <p className="text-sm text-muted-foreground">
                AI predicted: <span className="font-medium text-foreground">{lastResult.ai_feedback.ai_prediction}</span>
                {' '}{lastResult.ai_feedback.ai_agrees ? '(Agrees)' : '(Disagrees)'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Confidence: {Math.round(lastResult.ai_feedback.ai_confidence * 100)}%</p>
            </div>
          )}

          <Button onClick={continueToNext} className="w-full gap-2" size="lg">
            Continue to Next Question <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No question available</p>
          <Button onClick={() => router.push('/quizzes')}>Back to Quizzes</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto py-6 space-y-5">
        {/* Stats bar */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded font-medium text-sm capitalize ${difficultyBadge(getCurrentDifficulty())}`}>
                {getCurrentDifficulty()}
              </span>
              <span className="text-sm text-muted-foreground">
                Question {(sessionStats.total_questions || 0) + 1}
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="font-bold text-primary">{sessionStats.score || 0}</p>
                <p className="text-xs text-muted-foreground">Score</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-emerald-600 dark:text-emerald-400">{sessionStats.accuracy || 0}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-foreground">
                  {(sessionStats.consecutive_correct || {})[getCurrentDifficulty() as keyof typeof sessionStats.consecutive_correct] || 0}
                </p>
                <p className="text-xs text-muted-foreground">Streak</p>
              </div>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-xl font-semibold text-card-foreground leading-snug">
            {currentQuestion.question_text}
          </h2>
          <div className="space-y-2">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => setSelectedAnswer(option)}
                className={`w-full p-3.5 text-left rounded-lg border-2 transition-colors text-sm ${
                  selectedAnswer === option
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-background hover:border-primary/40 hover:bg-muted/50 text-foreground'
                }`}
              >
                <span className="font-semibold text-muted-foreground mr-3">{String.fromCharCode(65 + index)})</span>
                {option}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={submitAnswer}
          disabled={!selectedAnswer || loading}
          className="w-full gap-2"
          size="lg"
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <><span>Submit Answer</span><ArrowRight className="h-4 w-4" /></>}
        </Button>
      </div>
    </div>
  )
}
