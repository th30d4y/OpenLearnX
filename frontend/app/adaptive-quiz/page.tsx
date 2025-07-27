'use client'
import React, { useState, useEffect } from 'react'
import { Brain, Target, TrendingUp, Clock, Award, Sparkles, ChevronRight } from 'lucide-react'

interface Question {
  question_id: string
  question_text: string
  choices: {
    A: string
    B: string
    C: string
    D: string
  }
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
  consecutive_correct: {
    easy: number
    medium: number
    hard: number
  }
  difficulty_breakdown: {
    [key: string]: {
      questions: number
      correct: number
      accuracy: number
    }
  }
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
        body: JSON.stringify({
          user_id: `user_${Date.now()}`
        })
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
    } catch (error) {
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
        body: JSON.stringify({
          answer: selectedAnswer,
          question_data: currentQuestion
        })
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
    } catch (error) {
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
        body: JSON.stringify({
          question_text: currentQuestion.question_text,
          choices: currentQuestion.choices
        })
      })

      const data = await response.json()

      if (data.success) {
        setAIPrediction(data.prediction)
        setShowPrediction(true)
      }
    } catch (error) {
      console.error('Failed to get AI prediction:', error)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-900'
      case 'medium': return 'text-yellow-400 bg-yellow-900'
      case 'hard': return 'text-red-400 bg-red-900'
      default: return 'text-gray-400 bg-gray-700'
    }
  }

  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="max-w-2xl mx-auto p-6 text-center">
          <div className="mb-8">
            <Brain className="h-16 w-16 text-purple-400 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">🧠 Adaptive AI Quiz</h1>
            <p className="text-gray-400 max-w-lg mx-auto">
              Experience an intelligent quiz that adapts to your skill level in real-time using our trained CNN model.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 p-4 rounded-lg">
              <Target className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Adaptive Difficulty</h3>
              <p className="text-sm text-gray-400">
                Questions adjust based on your performance
              </p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <Brain className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">AI Predictions</h3>
              <p className="text-sm text-gray-400">
                See how our AI model would answer
              </p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Smart Analytics</h3>
              <p className="text-sm text-gray-400">
                Track performance across difficulty levels
              </p>
            </div>
          </div>

          <button
            onClick={startQuiz}
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 px-8 py-4 rounded-lg font-semibold flex items-center justify-center space-x-2 mx-auto"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>Start Adaptive Quiz</span>
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  if (quizCompleted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center mb-8">
            <Award className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Quiz Complete! 🎉</h1>
            <p className="text-gray-400">
              You've completed the adaptive quiz. Here are your results:
            </p>
          </div>

          {sessionStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 p-6 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  {sessionStats.total_questions}
                </div>
                <div className="text-sm text-gray-400">Total Questions</div>
              </div>
              
              <div className="bg-gray-800 p-6 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {sessionStats.overall_accuracy}%
                </div>
                <div className="text-sm text-gray-400">Overall Accuracy</div>
              </div>
              
              <div className="bg-gray-800 p-6 rounded-lg text-center">
                <div className={`text-3xl font-bold mb-2 ${getDifficultyColor(sessionStats.current_difficulty).split(' ')[0]}`}>
                  {sessionStats.current_difficulty}
                </div>
                <div className="text-sm text-gray-400">Final Difficulty</div>
              </div>
              
              <div className="bg-gray-800 p-6 rounded-lg text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {sessionStats.total_correct}/{sessionStats.total_questions}
                </div>
                <div className="text-sm text-gray-400">Correct Answers</div>
              </div>
            </div>
          )}

          {sessionStats && (
            <div className="bg-gray-800 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-bold mb-4">Performance by Difficulty</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(sessionStats.difficulty_breakdown).map(([difficulty, stats]) => (
                  <div key={difficulty} className="bg-gray-900 p-4 rounded">
                    <div className={`px-2 py-1 rounded text-xs font-medium mb-2 ${getDifficultyColor(difficulty)}`}>
                      {difficulty.toUpperCase()}
                    </div>
                    <div className="text-lg font-bold">{stats.accuracy}%</div>
                    <div className="text-sm text-gray-400">
                      {stats.correct}/{stats.questions} questions
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => {
                setQuizStarted(false)
                setQuizCompleted(false)
                setSessionId(null)
                setCurrentQuestion(null)
                setSessionStats(null)
                setLastResult(null)
              }}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold"
            >
              Take Another Quiz
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header with Stats */}
        {sessionStats && (
          <div className="bg-gray-800 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-400">
                  {sessionStats.total_questions}
                </div>
                <div className="text-xs text-gray-400">Questions</div>
              </div>
              
              <div>
                <div className="text-lg font-bold text-green-400">
                  {sessionStats.overall_accuracy}%
                </div>
                <div className="text-xs text-gray-400">Accuracy</div>
              </div>
              
              <div>
                <div className={`text-lg font-bold ${getDifficultyColor(sessionStats.current_difficulty).split(' ')[0]}`}>
                  {sessionStats.current_difficulty}
                </div>
                <div className="text-xs text-gray-400">Current Level</div>
              </div>
              
              <div>
                <div className="text-lg font-bold text-purple-400">
                  {sessionStats.consecutive_correct[sessionStats.current_difficulty]}
                </div>
                <div className="text-xs text-gray-400">Streak</div>
              </div>
              
              <div>
                <div className={`text-sm px-2 py-1 rounded ${sessionStats.model_available ? 'bg-green-900 text-green-400' : 'bg-yellow-900 text-yellow-400'}`}>
                  {sessionStats.model_available ? '🤖 AI Active' : '🔄 Fallback'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Last Result */}
        {lastResult && (
          <div className={`p-4 rounded-lg mb-6 border-l-4 ${lastResult.is_correct ? 'bg-green-900 border-green-500' : 'bg-red-900 border-red-500'}`}>
            <div className="flex justify-between items-center">
              <span className="font-semibold">
                {lastResult.is_correct ? '✅ Correct!' : '❌ Incorrect'}
              </span>
              {lastResult.difficulty_changed && (
                <span className="text-sm bg-blue-900 px-2 py-1 rounded">
                  Level: {lastResult.previous_difficulty} → {lastResult.new_difficulty}
                </span>
              )}
            </div>
            <p className="text-sm mt-1">{lastResult.explanation}</p>
            
            {lastResult.llm_prediction && (
              <div className="mt-2 text-sm bg-black bg-opacity-30 p-2 rounded">
                🤖 AI predicted: {lastResult.llm_prediction.llm_prediction} 
                {lastResult.llm_agrees ? ' ✅ (Agreed)' : ' ❌ (Disagreed)'}
                <span className="ml-2 text-gray-400">
                  ({lastResult.llm_prediction.confidence * 100}% confidence)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Current Question */}
        {currentQuestion && (
          <div className="bg-gray-800 p-6 rounded-lg mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(currentQuestion.difficulty)}`}>
                    {currentQuestion.difficulty.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-400">
                    {currentQuestion.category}
                  </span>
                </div>
                <h2 className="text-xl font-semibold">
                  {currentQuestion.question_text}
                </h2>
              </div>
              
              <button
                onClick={getAIPrediction}
                className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm flex items-center space-x-1"
              >
                <Brain className="h-4 w-4" />
                <span>AI Hint</span>
              </button>
            </div>

            {/* AI Prediction */}
            {showPrediction && aiPrediction && (
              <div className="bg-purple-900 bg-opacity-30 border border-purple-600 p-4 rounded mb-4">
                <h3 className="font-semibold mb-2 flex items-center space-x-2">
                  <Brain className="h-4 w-4" />
                  <span>🤖 AI Prediction</span>
                </h3>
                <p className="text-sm">
                  AI suggests: <strong>{aiPrediction.llm_prediction}</strong>
                </p>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Confidence: {(aiPrediction.confidence * 100).toFixed(1)}%</span>
                  <span>{aiPrediction.fallback_mode ? '(Fallback mode)' : '(CNN model)'}</span>
                </div>
              </div>
            )}

            {/* Answer Choices */}
            <div className="space-y-3">
              {Object.entries(currentQuestion.choices).map(([letter, text]) => (
                <button
                  key={letter}
                  onClick={() => setSelectedAnswer(letter)}
                  className={`w-full p-4 text-left rounded-lg border transition-colors ${
                    selectedAnswer === letter
                      ? 'bg-blue-900 border-blue-500 text-blue-100'
                      : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full border-2 border-gray-400 flex items-center justify-center text-sm font-bold">
                      {letter}
                    </span>
                    <span>{text}</span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={submitAnswer}
              disabled={!selectedAnswer || loading}
              className="mt-6 w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 p-4 rounded-lg font-semibold flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>Submit Answer</span>
                  <ChevronRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
