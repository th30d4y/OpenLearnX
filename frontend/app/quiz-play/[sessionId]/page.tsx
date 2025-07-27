'use client'
import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Brain, Trophy, Target, ArrowRight, CheckCircle, XCircle } from 'lucide-react'

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
  consecutive_correct?: {
    easy: number
    medium: number
    hard: number
  }
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
    accuracy: 0
  })
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [showResult, setShowResult] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [quizCompleted, setQuizCompleted] = useState(false)

  // ✅ Safe getter for current difficulty with fallback
  const getCurrentDifficulty = () => {
    return sessionStats?.current_difficulty || 'easy'
  }

  // ✅ Safe getter for consecutive correct with fallback
  const getConsecutiveCorrect = () => {
    return sessionStats?.consecutive_correct || { easy: 0, medium: 0, hard: 0 }
  }

  // Fetch next question
  const fetchNextQuestion = async () => {
    try {
      setLoading(true)
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/session/${sessionId}/next-question`)
      const data = await response.json()

      console.log('Next question response:', data) // ✅ Debug log

      if (data.success) {
        if (data.quiz_completed) {
          setQuizCompleted(true)
          setCurrentQuestion(null)
        } else {
          setCurrentQuestion(data.question)
          // ✅ Safely update session stats with fallbacks
          setSessionStats(prev => ({
            current_difficulty: data.session_stats?.current_difficulty || prev.current_difficulty || 'easy',
            consecutive_correct: data.session_stats?.consecutive_correct || prev.consecutive_correct || { easy: 0, medium: 0, hard: 0 },
            total_questions: data.session_stats?.total_questions || prev.total_questions || 0,
            correct_answers: data.session_stats?.correct_answers || prev.correct_answers || 0,
            score: data.session_stats?.score || prev.score || 0,
            accuracy: data.session_stats?.accuracy || prev.accuracy || 0
          }))
        }
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Fetch question error:', error)
      alert('Failed to fetch next question')
    } finally {
      setLoading(false)
    }
  }

  // Submit answer
  const submitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion) return

    try {
      setLoading(true)
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/session/${sessionId}/submit-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer: selectedAnswer,
          question_data: currentQuestion
        })
      })

      const data = await response.json()
      console.log('Submit answer response:', data) // ✅ Debug log

      if (data.success) {
        setLastResult(data)
        setShowResult(true)
        
        // ✅ Safely update session stats with fallbacks
        setSessionStats(prev => ({
          current_difficulty: data.session_stats?.current_difficulty || prev.current_difficulty || 'easy',
          consecutive_correct: data.session_stats?.consecutive_correct || prev.consecutive_correct || { easy: 0, medium: 0, hard: 0 },
          total_questions: data.session_stats?.total_questions || prev.total_questions || 0,
          correct_answers: data.session_stats?.correct_answers || prev.correct_answers || 0,
          score: data.session_stats?.score || prev.score || 0,
          accuracy: data.session_stats?.accuracy || prev.accuracy || 0
        }))
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Submit answer error:', error)
      alert('Failed to submit answer')
    } finally {
      setLoading(false)
    }
  }

  // Continue to next question
  const continueToNext = () => {
    setShowResult(false)
    setSelectedAnswer('')
    setLastResult(null)
    fetchNextQuestion()
  }

  // Initial load
  useEffect(() => {
    if (sessionId) {
      fetchNextQuestion()
    }
  }, [sessionId])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-900'
      case 'medium': return 'text-yellow-400 bg-yellow-900'
      case 'hard': return 'text-red-400 bg-red-900'
      default: return 'text-gray-400 bg-gray-700'
    }
  }

  if (loading && !currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Loading question...</p>
        </div>
      </div>
    )
  }

  if (quizCompleted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="max-w-2xl mx-auto p-6 text-center">
          <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-4">🎉 Quiz Completed!</h1>
          
          <div className="bg-gray-800 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-bold mb-4">Final Results</h2>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-gray-700 p-4 rounded">
                <div className="text-2xl font-bold text-blue-400">{sessionStats.score || 0}</div>
                <div className="text-gray-400">Final Score</div>
              </div>
              <div className="bg-gray-700 p-4 rounded">
                <div className="text-2xl font-bold text-green-400">{sessionStats.accuracy || 0}%</div>
                <div className="text-gray-400">Accuracy</div>
              </div>
              <div className="bg-gray-700 p-4 rounded">
                <div className="text-2xl font-bold text-purple-400">{sessionStats.total_questions || 0}</div>
                <div className="text-gray-400">Questions</div>
              </div>
              <div className="bg-gray-700 p-4 rounded">
                <div className={`text-2xl font-bold px-3 py-1 rounded ${getDifficultyColor(getCurrentDifficulty())}`}>
                  {getCurrentDifficulty().toUpperCase()}
                </div>
                <div className="text-gray-400">Final Level</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push('/quizzes')}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    )
  }

  if (showResult && lastResult) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="max-w-2xl mx-auto p-6">
          <div className="text-center mb-6">
            {lastResult.is_correct ? (
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            ) : (
              <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            )}
            <h1 className="text-3xl font-bold mb-2">
              {lastResult.is_correct ? '✅ Correct!' : '❌ Incorrect'}
            </h1>
            <p className="text-gray-400">
              {lastResult.is_correct ? 'Great job!' : 'Keep trying!'}
            </p>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg mb-6">
            <h3 className="font-semibold mb-2">Correct Answer:</h3>
            <p className="text-green-400 mb-4">{lastResult.correct_answer}</p>
            
            {lastResult.explanation && (
              <div>
                <h3 className="font-semibold mb-2">Explanation:</h3>
                <p className="text-gray-300">{lastResult.explanation}</p>
              </div>
            )}
          </div>

          {/* Difficulty Change Notification */}
          {lastResult.difficulty_changed && (
            <div className="bg-blue-900 border border-blue-600 p-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">📈 Difficulty Updated!</h3>
              <p>
                Moved from <span className={`px-2 py-1 rounded ${getDifficultyColor(lastResult.previous_difficulty)}`}>
                  {lastResult.previous_difficulty}
                </span> to <span className={`px-2 py-1 rounded ${getDifficultyColor(lastResult.new_difficulty)}`}>
                  {lastResult.new_difficulty}
                </span>
              </p>
            </div>
          )}

          {/* Session Stats */}
          <div className="bg-gray-800 p-6 rounded-lg mb-6">
            <h3 className="font-semibold mb-4">📊 Your Progress</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-blue-400">{sessionStats.score || 0}</div>
                <div className="text-gray-400 text-sm">Score</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-400">{sessionStats.accuracy || 0}%</div>
                <div className="text-gray-400 text-sm">Accuracy</div>
              </div>
            </div>
          </div>

          {/* AI Feedback */}
          {lastResult.ai_feedback && (
            <div className="bg-purple-900 border border-purple-600 p-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2 flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>🤖 AI Analysis</span>
              </h3>
              <p className="text-purple-200">
                AI predicted: <span className="font-semibold">{lastResult.ai_feedback.ai_prediction}</span>
                {lastResult.ai_feedback.ai_agrees ? ' ✅ (Agrees with correct answer)' : ' ❌ (Disagrees)'}
              </p>
              <p className="text-xs text-purple-300 mt-1">
                Confidence: {Math.round(lastResult.ai_feedback.ai_confidence * 100)}%
              </p>
            </div>
          )}

          <button
            onClick={continueToNext}
            className="w-full bg-blue-600 hover:bg-blue-700 p-4 rounded-lg font-semibold flex items-center justify-center space-x-2"
          >
            <span>Continue to Next Question</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p>No question available</p>
          <button
            onClick={() => router.push('/quizzes')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header with Stats */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded font-semibold ${getDifficultyColor(getCurrentDifficulty())}`}>
                {getCurrentDifficulty().toUpperCase()}
              </span>
              <span className="text-gray-400">
                Question {(sessionStats.total_questions || 0) + 1}
              </span>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <div className="text-center">
                <div className="font-bold text-blue-400">{sessionStats.score || 0}</div>
                <div className="text-gray-400">Score</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-green-400">{sessionStats.accuracy || 0}%</div>
                <div className="text-gray-400">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-purple-400">{getConsecutiveCorrect()[getCurrentDifficulty()] || 0}</div>
                <div className="text-gray-400">Streak</div>
              </div>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h1 className="text-2xl font-bold mb-6">{currentQuestion.question_text}</h1>
          
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => setSelectedAnswer(option)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-colors ${
                  selectedAnswer === option
                    ? 'border-blue-500 bg-blue-900'
                    : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                }`}
              >
                <span className="font-semibold mr-3">{String.fromCharCode(65 + index)})</span>
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={submitAnswer}
          disabled={!selectedAnswer || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 p-4 rounded-lg font-semibold flex items-center justify-center space-x-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <span>Submit Answer</span>
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
