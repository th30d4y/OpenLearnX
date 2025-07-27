'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Sparkles, Settings, Clock, Trophy, AlertCircle } from 'lucide-react'

export default function AIQuizGenerator() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    topic: '',
    difficulty: 'medium',
    num_questions: 5
  })
  const [generatedQuiz, setGeneratedQuiz] = useState(null)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://127.0.0.1:5000/api/quizzes/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedQuiz(data.quiz)
        // Redirect to the generated quiz
        router.push(`/quizzes/${data.quiz.id}`)
      } else {
        setError(data.error || 'Failed to generate quiz')
      }
    } catch (err) {
      setError('Network error: Could not generate quiz')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Brain className="h-12 w-12 text-purple-400" />
            <Sparkles className="h-8 w-8 text-yellow-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">🤖 AI Quiz Generator</h1>
          <p className="text-gray-400">
            Generate intelligent quizzes using our trained CNN model
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900 border border-red-600 p-4 rounded-lg mb-6 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Generator Form */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <Settings className="h-5 w-5 text-blue-400" />
            <span>Quiz Configuration</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Topic Input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Topic/Subject
              </label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData(prev => ({...prev, topic: e.target.value}))}
                placeholder="e.g., Science, History, Technology"
                className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
              <p className="text-sm text-gray-400 mt-1">
                AI will generate questions related to this topic
              </p>
            </div>

            {/* Difficulty Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Difficulty Level
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData(prev => ({...prev, difficulty: e.target.value}))}
                className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="easy">🟢 Easy</option>
                <option value="medium">🟡 Medium</option>
                <option value="hard">🔴 Hard</option>
              </select>
            </div>

            {/* Number of Questions */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Number of Questions
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="3"
                  max="20"
                  value={formData.num_questions}
                  onChange={(e) => setFormData(prev => ({...prev, num_questions: parseInt(e.target.value)}))}
                  className="flex-1"
                />
                <span className="bg-gray-700 px-3 py-1 rounded font-bold">
                  {formData.num_questions}
                </span>
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 p-4 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Generating Quiz...</span>
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5" />
                  <span>🚀 Generate AI Quiz</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <Brain className="h-8 w-8 text-purple-400 mx-auto mb-2" />
            <h3 className="font-semibold mb-1">AI-Powered</h3>
            <p className="text-sm text-gray-400">
              Uses trained CNN model for intelligent question selection
            </p>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <Clock className="h-8 w-8 text-blue-400 mx-auto mb-2" />
            <h3 className="font-semibold mb-1">Instant Generation</h3>
            <p className="text-sm text-gray-400">
              Generate quizzes in seconds with AI processing
            </p>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
            <h3 className="font-semibold mb-1">Smart Feedback</h3>
            <p className="text-sm text-gray-400">
              AI provides intelligent feedback on answers
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
