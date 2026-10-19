'use client'
import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Brain, CheckCircle, XCircle, Sparkles, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Question {
  id: string
  question_number: number
  question_text: string
  options: string[]
  correct_answer: string
  points: number
  ai_prediction?: any
}

interface Quiz {
  id: string
  title: string
  description: string
  questions: Question[]
  generated_by?: string
  total_points: number
}

export default function QuizTaking() {
  const params = useParams()
  const router = useRouter()
  const quizId = params.quizId as string

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [showAIHint, setShowAIHint] = useState(false)
  const [aiPrediction, setAIPrediction] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => { fetchQuiz() }, [quizId])

  const fetchQuiz = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/${quizId}`)
      const data = await response.json()
      if (data.success) setQuiz(data.quiz)
      else setError(data.error || 'Quiz not found')
    } catch {
      setError('Failed to load quiz')
    } finally {
      setLoading(false)
    }
  }

  const getAIHint = async () => {
    if (!quiz || !quiz.questions[currentQuestion]) return
    try {
      setShowAIHint(true)
      const response = await fetch('http://127.0.0.1:5000/api/quizzes/ai-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_text: quiz.questions[currentQuestion].question_text }),
      })
      const data = await response.json()
      if (data.success) setAIPrediction(data.prediction)
    } catch (err) {
      console.error('Failed to get AI hint:', err)
    }
  }

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const submitQuiz = async () => {
    if (!quiz) return
    const unanswered = quiz.questions.filter(q => !answers[q.id])
    if (unanswered.length > 0 && !confirm(`You have ${unanswered.length} unanswered questions. Submit anyway?`)) return
    setSubmitting(true)
    try {
      const token = localStorage.getItem('openlearnx_jwt_token') || localStorage.getItem('openlearnx_token')
      const storedUser = JSON.parse(localStorage.getItem('openlearnx_user') || 'null')
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          answers,
          participant_name: storedUser?.name || storedUser?.username || 'User',
          user_id: storedUser?.id,
          wallet_address: storedUser?.wallet_address,
        }),
      })
      const data = await response.json()
      if (data.success) setResults(data.results)
      else setError(data.error || 'Failed to submit quiz')
    } catch {
      setError('Failed to submit quiz')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading quiz…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-foreground text-lg">{error}</p>
          <Button onClick={() => router.push('/quizzes')}>Back to Quizzes</Button>
        </div>
      </div>
    )
  }

  if (results) {
    const scoreColor = results.score >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : results.score >= 60
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400'

    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-3xl mx-auto py-8 space-y-6">
          <div className="text-center">
            {results.score >= 80
              ? <CheckCircle className="h-14 w-14 text-emerald-500 mx-auto mb-3" />
              : <XCircle className="h-14 w-14 text-amber-500 mx-auto mb-3" />}
            <h1 className="text-3xl font-bold text-foreground">Quiz Complete</h1>
            <p className={`text-4xl font-bold mt-3 ${scoreColor}`}>{results.score}%</p>
            <p className="text-muted-foreground mt-1">{results.correct_answers} / {results.total_questions} correct</p>
          </div>

          {results.ai_feedback && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h2 className="font-semibold text-card-foreground flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI Feedback
              </h2>
              <div className="space-y-3">
                {results.ai_feedback.map((feedback: any, index: number) => (
                  <div key={index} className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Question {index + 1}</p>
                    <p className="text-sm text-foreground mb-2">{feedback.question}</p>
                    <div className="flex items-center gap-2 mb-2">
                      {feedback.is_correct
                        ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                        : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                      <span className="text-sm text-muted-foreground">Your answer: <span className="text-foreground font-medium">{feedback.user_answer}</span></span>
                    </div>
                    {feedback.ai_feedback && (
                      <div className="rounded border border-primary/20 bg-primary/5 p-2">
                        <p className="text-sm text-muted-foreground">{feedback.ai_feedback.feedback}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={() => router.push('/quizzes')} className="w-full" size="lg">Back to Quizzes</Button>
        </div>
      </div>
    )
  }

  if (!quiz) return null
  const question = quiz.questions[currentQuestion]
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto py-6 space-y-5">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              {quiz.generated_by === 'AI' && <Brain className="h-5 w-5 text-primary" />}
              {quiz.title}
            </h1>
            <span className="text-sm text-muted-foreground">
              {currentQuestion + 1} / {quiz.questions.length}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question card */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold text-card-foreground leading-snug">{question.question_text}</h2>
            {quiz.generated_by === 'AI' && (
              <Button variant="outline" size="sm" onClick={getAIHint} className="shrink-0 gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                AI Hint
              </Button>
            )}
          </div>

          {showAIHint && aiPrediction && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-1">
                <Brain className="h-3.5 w-3.5 text-primary" /> AI Suggestion
              </p>
              <p className="text-sm text-muted-foreground">
                Predicted answer: <span className="font-medium text-foreground">{aiPrediction.predicted_answer}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Confidence: {(aiPrediction.confidence * 100).toFixed(1)}%</p>
            </div>
          )}

          <div className="space-y-2">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(question.id, option)}
                className={`w-full p-3.5 text-left rounded-lg border-2 transition-colors text-sm ${
                  answers[question.id] === option
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

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            {Object.keys(answers).length} of {quiz.questions.length} answered
          </span>

          {currentQuestion === quiz.questions.length - 1 ? (
            <Button onClick={submitQuiz} disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Submitting…' : 'Submit Quiz'}
            </Button>
          ) : (
            <Button onClick={() => setCurrentQuestion(prev => Math.min(quiz.questions.length - 1, prev + 1))}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
