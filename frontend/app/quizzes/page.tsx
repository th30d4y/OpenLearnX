'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Plus, Clock, Trophy, Users, Crown, Target, Play, Globe, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
      case 'hard': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
      case 'active': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  if (loading && activeTab === 'traditional' && quizzes.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading quizzes…</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'rooms', label: 'Live Quiz Rooms', icon: Users },
    { id: 'adaptive', label: 'Adaptive Quiz', icon: Brain },
    { id: 'traditional', label: 'Traditional', icon: Target },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Quiz Platform</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Adaptive AI quizzes, live rooms, and traditional question sets
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 border border-border rounded-lg p-1 w-fit mb-8 bg-muted/30">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Live Quiz Rooms */}
        {activeTab === 'rooms' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => router.push('/quiz-host')} className="gap-2">
                <Crown className="h-4 w-4" />
                Host a Quiz
              </Button>
              <Button onClick={() => router.push('/quiz-join')} variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                Join Quiz
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Public Rooms</h2>
              <Button onClick={fetchPublicRooms} variant="ghost" size="sm" className="gap-2">
                <Globe className="h-4 w-4" />
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : publicRooms.length === 0 ? (
              <div className="text-center py-16 rounded-xl border border-border bg-card">
                <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-foreground">No public rooms available</p>
                <p className="text-sm text-muted-foreground mt-1 mb-6">Be the first to create one</p>
                <Button onClick={() => router.push('/quiz-host')}>Create Room</Button>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {publicRooms.map((room) => (
                  <div key={room.room_id} className="rounded-xl border border-border bg-card p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-card-foreground">{room.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Host: {room.host_name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getStatusBadge(room.status)}`}>
                        {room.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-md border border-border bg-muted/30 p-2.5 text-center">
                        <p className="font-semibold text-foreground">{room.participants_count}</p>
                        <p className="text-xs text-muted-foreground">Participants</p>
                      </div>
                      <div className="rounded-md border border-border bg-muted/30 p-2.5 text-center">
                        <p className="font-semibold text-foreground">{room.questions_count}</p>
                        <p className="text-xs text-muted-foreground">Questions</p>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Easy: {room.questions_by_difficulty?.easy || 0}</span>
                      <span>Medium: {room.questions_by_difficulty?.medium || 0}</span>
                      <span>Hard: {room.questions_by_difficulty?.hard || 0}</span>
                    </div>

                    <div className="text-center">
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                        Code: {room.room_code}
                      </span>
                    </div>

                    <Button
                      onClick={() => router.push(`/quiz-join?room=${room.room_code}`)}
                      className="w-full gap-2"
                      size="sm"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Join Room
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Adaptive Quiz */}
        {activeTab === 'adaptive' && (
          <div className="max-w-2xl space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-foreground">Adaptive AI Quiz</h2>
              <p className="text-muted-foreground">
                An intelligent quiz that adjusts difficulty in real-time using our trained CNN model.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Target, label: 'Adaptive Difficulty', desc: 'Questions adjust based on your performance' },
                { icon: Brain, label: 'AI Predictions', desc: 'See how our AI model would answer' },
                { icon: Trophy, label: 'Smart Analytics', desc: 'Track performance across difficulty levels' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="font-medium text-card-foreground text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>

            <Button onClick={() => router.push('/adaptive-quiz')} size="lg" className="gap-2">
              <Brain className="h-4 w-4" />
              Start Adaptive Quiz
            </Button>
          </div>
        )}

        {/* Traditional Quizzes */}
        {activeTab === 'traditional' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
              {aiAvailable && (
                <Button onClick={() => router.push('/quizzes/generate')} className="gap-2">
                  <Brain className="h-4 w-4" />
                  Generate AI Quiz
                </Button>
              )}
              <Button onClick={() => router.push('/quizzes/create')} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Manual Quiz
              </Button>
            </div>

            {aiAvailable && (
              <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
                <Brain className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-card-foreground">AI Service Active</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Trained CNN model ready to generate quizzes and provide feedback
                  </p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-16 rounded-xl border border-border bg-card">
                <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-foreground">No quizzes yet</p>
                <p className="text-sm text-muted-foreground mt-1 mb-6">Create your first quiz or generate one using AI</p>
                {aiAvailable && (
                  <Button onClick={() => router.push('/quizzes/generate')}>Generate AI Quiz</Button>
                )}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz._id}
                    onClick={() => router.push(`/quizzes/${quiz.id}`)}
                    className="rounded-xl border border-border bg-card p-5 cursor-pointer hover:shadow-md transition-shadow space-y-3"
                  >
                    <div className="h-1 rounded-t-xl bg-primary opacity-70 -mx-5 -mt-5 mb-2 rounded-t-xl" />
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-card-foreground leading-snug line-clamp-2 flex items-center gap-1.5">
                        {quiz.generated_by === 'AI' && <Brain className="h-4 w-4 text-primary shrink-0" />}
                        {quiz.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize shrink-0 ${getDifficultyBadge(quiz.difficulty)}`}>
                        {quiz.difficulty}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">{quiz.description}</p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Target className="h-3.5 w-3.5" />
                        {quiz.questions?.length || 0} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5" />
                        {quiz.total_points} pts
                      </span>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(quiz.created_at).toLocaleDateString()}
                      </span>
                      {quiz.generated_by === 'AI' && (
                        <span className="text-xs text-primary font-medium">AI Generated</span>
                      )}
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
