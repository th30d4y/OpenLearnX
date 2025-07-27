'use client'
import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Brain, Clock, CheckCircle, XCircle, Sparkles, AlertCircle } from 'lucide-react'

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

  useEffect(() => {
    fetchQuiz()
  }, [quizId])

  const fetchQuiz = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/${quizId}`)
      const data = await response.json()

      if (data.success) {
        setQuiz(data.quiz)
      } else {
        setError(data.error || 'Quiz not found')
      }
    } catch (err) {
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
        body: JSON.stringify({
          question_text: quiz.questions[currentQuestion].question_text
        })
      })

      const data = await response.json()
      if (data.success) {
        setAIPrediction(data.prediction)
      }
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
    if (unanswered.length > 0) {
      if (!confirm(`You have ${unanswered.length} unanswered questions. Submit anyway?`)) {
        return
      }
    }

    setSubmitting(true)
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          participant_name: 'User' // You can get this from auth context
        })
      })

      const data = await response.json()
      if (data.success) {
        setResults(data.results)
      } else {
        setError(data.error || 'Failed to submit quiz')
      }
    } catch (err) {
      setError('Failed to submit quiz')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Loading AI Quiz...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-xl mb-4">{error}</p>
          <button
            onClick={() => router.push('/quizzes')}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    )
  }

  if (results) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">
              {results.score >= 80 ? '🏆' : results.score >= 60 ? '🎉' : '📚'}
            </div>
            <h1 className="text-3xl font-bold mb-2">Quiz Complete!</h1>
            <p className="text-xl text-gray-300">
              You scored {results.score}% ({results.correct_answers}/{results.total_questions})
            </p>
          </div>

          {/* AI Feedback */}
          {results.ai_feedback && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                <Brain className="h-5 w-5 text-purple-400" />
                <span>🤖 AI Feedback</span>
              </h2>
              
              <div className="space-y-4">
                {results.ai_feedback.map((feedback: any, index: number) => (
                  <div key={index} className="bg-gray-900 p-4 rounded border-l-4 border-purple-500">
                    <h3 className="font-semibold mb-2">Question {index + 1}</h3>
                    <p className="text-sm text-gray-300 mb-2">{feedback.question}</p>
                    <div className="flex items-center space-x-2 mb-2">
                      {feedback.is_correct ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                      <span className="text-sm">
                        Your answer: {feedback.user_answer}
                      </span>
                    </div>
                    {feedback.ai_feedback && (
                      <p className="text-sm text-purple-300 bg-purple-900 bg-opacity-30 p-2 rounded">
                        🤖 {feedback.ai_feedback.feedback}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => router.push('/quizzes')}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold"
            >
              Back to Quizzes
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!quiz) return null

  const question = quiz.questions[currentQuestion]
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold flex items-center space-x-2">
              {quiz.generated_by === 'AI' && <Brain className="h-6 w-6 text-purple-400" />}
              <span>{quiz.title}</span>
            </h1>
            <div className="text-sm text-gray-400">
              Question {currentQuestion + 1} of {quiz.questions.length}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold">
              {question.question_text}
            </h2>
            {quiz.generated_by === 'AI' && (
              <button
                onClick={getAIHint}
                className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm flex items-center space-x-1"
              >
                <Sparkles className="h-4 w-4" />
                <span>AI Hint</span>
              </button>
            )}
          </div>

          {/* AI Hint */}
          {showAIHint && aiPrediction && (
            <div className="bg-purple-900 bg-opacity-30 border border-purple-600 p-4 rounded mb-4">
              <h3 className="font-semibold mb-2 flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span>🤖 AI Suggestion</span>
              </h3>
              <p className="text-sm">
                AI predicts: <strong>{aiPrediction.predicted_answer}</strong>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Confidence: {(aiPrediction.confidence * 100).toFixed(1)}%
              </p>
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(question.id, option)}
                className={`w-full p-4 text-left rounded-lg border transition-colors ${
                  answers[question.id] === option
                    ? 'bg-purple-900 border-purple-500 text-purple-100'
                    : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 rounded-full border-2 border-gray-400 flex items-center justify-center text-sm">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
            className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 px-6 py-2 rounded"
          >
            Previous
          </button>

          <div className="text-sm text-gray-400">
            {Object.keys(answers).length} of {quiz.questions.length} answered
          </div>

          {currentQuestion === quiz.questions.length - 1 ? (
            <button
              onClick={submitQuiz}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-2 rounded flex items-center space-x-2"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : null}
              <span>{submitting ? 'Submitting...' : 'Submit Quiz'}</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion(prev => Math.min(quiz.questions.length - 1, prev + 1))}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
