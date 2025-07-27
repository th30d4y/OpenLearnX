'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Plus, Clock, Trophy, Users, Sparkles, Crown, Target, Play, Globe, Lock } from 'lucide-react'

interface Quiz {
  _id: string
  id: string
  title: string
  description: string
  difficulty: string
  questions: any[]
  generated_by?: string
  created_at: string
  total_points: number
}

interface QuizRoom {
  room_id: string
  room_code: string
  title: string
  host_name: string
  is_private: boolean
  status: string
  participants_count: number
  questions_count: number
  questions_by_difficulty: {
    easy: number
    medium: number
    hard: number
  }
}

export default function QuizzesPage() {
  const [activeTab, setActiveTab] = useState<'traditional' | 'rooms' | 'adaptive'>('rooms')
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [publicRooms, setPublicRooms] = useState<QuizRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [aiAvailable, setAiAvailable] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (activeTab === 'traditional') {
      fetchTraditionalQuizzes()
    } else if (activeTab === 'rooms') {
      fetchPublicRooms()
    }
  }, [activeTab])

  const fetchTraditionalQuizzes = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://127.0.0.1:5000/api/quizzes')
      const data = await response.json()

      if (data.success) {
        setQuizzes(data.quizzes)
        setAiAvailable(data.ai_available)
      }
    } catch (err) {
      console.error('Failed to fetch quizzes:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPublicRooms = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://127.0.0.1:5000/api/quizzes/public-rooms')
      const data = await response.json()

      if (data.success) {
        setPublicRooms(data.public_rooms)
      }
    } catch (err) {
      console.error('Failed to fetch public rooms:', err)
    } finally {
      setLoading(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'text-green-400 bg-green-900'
      case 'medium': return 'text-yellow-400 bg-yellow-900'
      case 'hard': return 'text-red-400 bg-red-900'
      default: return 'text-gray-400 bg-gray-700'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'text-yellow-400 bg-yellow-900'
      case 'active': return 'text-green-400 bg-green-900'
      case 'completed': return 'text-gray-400 bg-gray-700'
      default: return 'text-gray-400 bg-gray-700'
    }
  }

  if (loading && activeTab === 'traditional' && quizzes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Loading quizzes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center space-x-3">
            <Trophy className="h-10 w-10 text-yellow-400" />
            <span>🧠 OpenLearnX Quiz Platform</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Experience adaptive quizzes with AI-powered questions and real-time difficulty adjustment
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center space-x-1 mb-8">
          {[
            { id: 'rooms', label: 'Live Quiz Rooms', icon: Users, description: 'Join or host live quizzes' },
            { id: 'adaptive', label: 'Adaptive Quiz', icon: Brain, description: 'AI-powered adaptive difficulty' },
            { id: 'traditional', label: 'Traditional Quizzes', icon: Target, description: 'Fixed question sets' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">{tab.label}</div>
                <div className="text-xs opacity-75">{tab.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Live Quiz Rooms Tab */}
        {activeTab === 'rooms' && (
          <div>
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center items-center">
              <button
                onClick={() => router.push('/quiz-host')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
              >
                <Crown className="h-5 w-5" />
                <span>👑 Host a Quiz</span>
              </button>
              
              <button
                onClick={() => router.push('/quiz-join')}
                className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold flex items-center space-x-2"
              >
                <Users className="h-5 w-5" />
                <span>🎯 Join Quiz</span>
              </button>
            </div>

            {/* Public Rooms Grid */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold flex items-center space-x-2">
                  <Globe className="h-6 w-6 text-green-400" />
                  <span>🌍 Public Quiz Rooms</span>
                </h2>
                <button
                  onClick={fetchPublicRooms}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center space-x-2"
                >
                  <span>🔄 Refresh</span>
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p>Loading rooms...</p>
                </div>
              ) : publicRooms.length === 0 ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg">
                  <Globe className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Public Rooms Available</h3>
                  <p className="text-gray-400 mb-6">
                    Be the first to create a public quiz room!
                  </p>
                  <button
                    onClick={() => router.push('/quiz-host')}
                    className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-semibold"
                  >
                    🚀 Create Room
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {publicRooms.map((room) => (
                    <div
                      key={room.room_id}
                      className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors border border-gray-700"
                    >
                      {/* Room Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold flex items-center space-x-2">
                            <Globe className="h-5 w-5 text-green-400" />
                            <span>{room.title}</span>
                          </h3>
                          <p className="text-gray-400 text-sm">Host: {room.host_name}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(room.status)}`}>
                          {room.status}
                        </span>
                      </div>

                      {/* Room Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div className="bg-gray-700 p-3 rounded text-center">
                          <div className="font-bold text-blue-400">{room.participants_count}</div>
                          <div className="text-gray-400">Participants</div>
                        </div>
                        <div className="bg-gray-700 p-3 rounded text-center">
                          <div className="font-bold text-purple-400">{room.questions_count}</div>
                          <div className="text-gray-400">Questions</div>
                        </div>
                      </div>

                      {/* Difficulty Breakdown */}
                      <div className="flex justify-between text-xs mb-4">
                        <span className="text-green-400">Easy: {room.questions_by_difficulty?.easy || 0}</span>
                        <span className="text-yellow-400">Medium: {room.questions_by_difficulty?.medium || 0}</span>
                        <span className="text-red-400">Hard: {room.questions_by_difficulty?.hard || 0}</span>
                      </div>

                      {/* Room Code */}
                      <div className="text-center mb-4">
                        <span className="bg-gray-700 px-3 py-1 rounded font-mono text-blue-400">
                          Code: {room.room_code}
                        </span>
                      </div>

                      {/* Join Button */}
                      <button
                        onClick={() => router.push(`/quiz-join?room=${room.room_code}`)}
                        className="w-full bg-green-600 hover:bg-green-700 p-3 rounded font-semibold flex items-center justify-center space-x-2"
                      >
                        <Play className="h-4 w-4" />
                        <span>Join Room</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Adaptive Quiz Tab */}
        {activeTab === 'adaptive' && (
          <div className="text-center">
            <div className="max-w-2xl mx-auto mb-8">
              <Brain className="h-16 w-16 text-purple-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-4">🧠 Adaptive AI Quiz</h2>
              <p className="text-gray-400 mb-6">
                Experience an intelligent quiz that adapts to your skill level in real-time using our trained CNN model.
              </p>
              
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
                  <Sparkles className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Smart Analytics</h3>
                  <p className="text-sm text-gray-400">
                    Track performance across difficulty levels
                  </p>
                </div>
              </div>

              <button
                onClick={() => router.push('/adaptive-quiz')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8 py-4 rounded-lg font-semibold flex items-center justify-center space-x-2 mx-auto"
              >
                <Sparkles className="h-5 w-5" />
                <span>🚀 Start Adaptive Quiz</span>
              </button>
            </div>
          </div>
        )}

        {/* Traditional Quizzes Tab */}
        {activeTab === 'traditional' && (
          <div>
            {/* AI Status & Create Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center items-center">
              {aiAvailable && (
                <button
                  onClick={() => router.push('/quizzes/generate')}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
                >
                  <Brain className="h-5 w-5" />
                  <Sparkles className="h-4 w-4" />
                  <span>🚀 Generate AI Quiz</span>
                </button>
              )}
              
              <button
                onClick={() => router.push('/quizzes/create')}
                className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Create Manual Quiz</span>
              </button>
            </div>

            {/* AI Status Banner */}
            {aiAvailable && (
              <div className="bg-gradient-to-r from-purple-900 to-blue-900 border border-purple-600 p-4 rounded-lg mb-8">
                <div className="flex items-center space-x-3">
                  <Brain className="h-6 w-6 text-purple-400" />
                  <div>
                    <h3 className="font-semibold">🤖 AI Service Active</h3>
                    <p className="text-sm text-gray-300">
                      Our trained CNN model is ready to generate intelligent quizzes and provide feedback
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Traditional Quizzes Grid */}
            {quizzes.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Traditional Quizzes Yet</h3>
                <p className="text-gray-400 mb-6">
                  Create your first quiz or generate one using AI
                </p>
                {aiAvailable && (
                  <button
                    onClick={() => router.push('/quizzes/generate')}
                    className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-semibold"
                  >
                    🚀 Generate AI Quiz
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz._id}
                    className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer"
                    onClick={() => router.push(`/quizzes/${quiz.id}`)}
                  >
                    {/* Quiz Header */}
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center space-x-2">
                        {quiz.generated_by === 'AI' && (
                          <Brain className="h-5 w-5 text-purple-400" />
                        )}
                        <span>{quiz.title}</span>
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(quiz.difficulty)}`}>
                        {quiz.difficulty}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {quiz.description}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{quiz.questions?.length || 0} questions</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Trophy className="h-4 w-4" />
                          <span>{quiz.total_points} pts</span>
                        </span>
                      </div>
                      
                      {quiz.generated_by === 'AI' && (
                        <div className="flex items-center space-x-1 text-purple-400">
                          <Sparkles className="h-3 w-3" />
                          <span className="text-xs">AI Generated</span>
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <span className="text-xs text-gray-500">
                        Created {new Date(quiz.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
