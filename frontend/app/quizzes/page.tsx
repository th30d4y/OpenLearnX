'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Plus, Trophy, Users, Crown, Target, Play, Globe, RotateCw, CheckCircle, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
  questions_by_difficulty: { easy: number; medium: number; hard: number }
}

type Tab = 'rooms' | 'adaptive' | 'traditional'

const MODES: { id: Tab; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'rooms', label: 'Live Rooms', desc: 'Join or host sessions', icon: Users },
  { id: 'adaptive', label: 'Adaptive AI', desc: 'Dynamic difficulty', icon: Brain },
  { id: 'traditional', label: 'Traditional', desc: 'Fixed question sets', icon: Target },
]

export default function QuizzesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('rooms')
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [publicRooms, setPublicRooms] = useState<QuizRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [aiAvailable, setAiAvailable] = useState(false)
  const [search, setSearch] = useState('')
  const [diffFilter, setDiffFilter] = useState('all')
  const router = useRouter()

  useEffect(() => {
    if (activeTab === 'traditional') fetchTraditionalQuizzes()
    else if (activeTab === 'rooms') fetchPublicRooms()
    else setLoading(false)
  }, [activeTab])

  const fetchTraditionalQuizzes = async () => {
    setLoading(true)
    try {
      const res = await fetch('http://127.0.0.1:5000/api/quizzes')
      const data = await res.json()
      if (data.success) { setQuizzes(data.quizzes); setAiAvailable(data.ai_available) }
    } catch (err) { console.error('Failed to fetch quizzes:', err) }
    finally { setLoading(false) }
  }

  const fetchPublicRooms = async () => {
    setLoading(true)
    try {
      const res = await fetch('http://127.0.0.1:5000/api/quizzes/public-rooms')
      const data = await res.json()
      if (data.success) setPublicRooms(data.public_rooms)
    } catch (err) { console.error('Failed to fetch rooms:', err) }
    finally { setLoading(false) }
  }

  const diffBadge = (d: string) => {
    switch (d.toLowerCase()) {
      case 'easy': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
      case 'hard': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const statusBadge = (s: string) => {
    switch (s) {
      case 'waiting': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
      case 'active': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const filteredQuizzes = quizzes.filter(q => {
    const matchSearch = q.title.toLowerCase().includes(search.toLowerCase())
    const matchDiff = diffFilter === 'all' || q.difficulty === diffFilter
    return matchSearch && matchDiff
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Quiz Platform</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Live rooms, adaptive AI, and traditional quizzes</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/quiz-host')} size="sm" className="gap-1.5">
              <Crown className="h-3.5 w-3.5" />
              Host a Quiz
            </Button>
            <Button onClick={() => router.push('/quiz-join')} variant="outline" size="sm" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Join
            </Button>
          </div>
        </div>
      </div>

      {/* Split layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex min-h-[calc(100vh-105px)]">
        {/* Left sidebar */}
        <nav className="w-44 shrink-0 border-r border-border py-5 pr-3 hidden sm:block">
          <div className="space-y-0.5">
            {MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setActiveTab(mode.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                  activeTab === mode.id
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <mode.icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm">{mode.label}</span>
                </div>
                <p className="text-xs text-muted-foreground pl-6 leading-tight">{mode.desc}</p>
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile tab bar */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-10 bg-card border-t border-border flex">
          {MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => setActiveTab(mode.id)}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs transition-colors ${
                activeTab === mode.id ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <mode.icon className="h-5 w-5" />
              {mode.label}
            </button>
          ))}
        </div>

        {/* Right panel */}
        <div className="flex-1 py-6 pl-0 sm:pl-6 pb-20 sm:pb-6">

          {/* Live Rooms */}
          {activeTab === 'rooms' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground tracking-tight">Live Quiz Rooms</h2>
                <Button onClick={fetchPublicRooms} variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                  <RotateCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="rounded-xl border border-border bg-card p-4 animate-skeleton">
                      <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  ))}
                </div>
              ) : publicRooms.length === 0 ? (
                <div className="rounded-xl border border-border bg-card py-16 text-center">
                  <Globe className="h-9 w-9 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium text-foreground text-sm">No public rooms available</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-5">Create the first room and invite participants</p>
                  <Button onClick={() => router.push('/quiz-host')} size="sm">Create a Room</Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {publicRooms.map(room => (
                    <div key={room.room_id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-card-foreground text-sm truncate">{room.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{room.host_name}</p>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(room.status)}`}>
                          {room.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{room.participants_count}</span>
                        <span className="flex items-center gap-1"><Target className="h-3 w-3" />{room.questions_count} q</span>
                        <span className="font-mono text-foreground">{room.room_code}</span>
                      </div>

                      <div className="flex justify-between text-xs text-muted-foreground border-t border-border pt-2">
                        <span>E:{room.questions_by_difficulty?.easy || 0}</span>
                        <span>M:{room.questions_by_difficulty?.medium || 0}</span>
                        <span>H:{room.questions_by_difficulty?.hard || 0}</span>
                      </div>

                      <Button
                        onClick={() => router.push(`/quiz-join?room=${room.room_code}`)}
                        size="sm"
                        className="w-full gap-1.5"
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

          {/* Adaptive AI */}
          {activeTab === 'adaptive' && (
            <div className="max-w-2xl space-y-8">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                    <Brain className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">Adaptive AI Quiz</h2>
                    <p className="text-sm text-muted-foreground">Difficulty adjusts in real-time based on your answers using a trained CNN model.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h3 className="text-sm font-medium text-card-foreground">How it works</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Start at medium difficulty', detail: 'Every session begins at medium to calibrate your baseline.' },
                    { label: 'Adaptive adjustment', detail: 'Answer 2+ correct → difficulty increases. Answer incorrectly → it decreases.' },
                    { label: 'Performance breakdown', detail: 'See accuracy by difficulty level and your final progression path at the end.' },
                  ].map(({ label, detail }, i) => (
                    <div key={i} className="flex gap-3">
                      <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-medium text-card-foreground mb-3">Difficulty progression</h3>
                <div className="flex items-center gap-2">
                  {['Easy', 'Medium', 'Hard'].map((level, i) => (
                    <React.Fragment key={level}>
                      <div className={`flex-1 rounded-lg border p-2.5 text-center ${i === 1 ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'}`}>
                        <p className="text-xs font-medium text-foreground">{level}</p>
                      </div>
                      {i < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Starting at Medium — adapts based on performance</p>
              </div>

              <Button onClick={() => router.push('/adaptive-quiz')} size="lg" className="gap-2">
                <Brain className="h-4 w-4" />
                Start Adaptive Quiz
              </Button>
            </div>
          )}

          {/* Traditional */}
          {activeTab === 'traditional' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="font-semibold text-foreground tracking-tight">Traditional Quizzes</h2>
                <div className="flex gap-2">
                  {aiAvailable && (
                    <Button onClick={() => router.push('/quizzes/generate')} size="sm" className="gap-1.5">
                      <Brain className="h-3.5 w-3.5" />
                      Generate with AI
                    </Button>
                  )}
                  <Button onClick={() => router.push('/quizzes/create')} variant="outline" size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Create Quiz
                  </Button>
                </div>
              </div>

              {/* Filter row */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search quizzes…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <select
                  value={diffFilter}
                  onChange={e => setDiffFilter(e.target.value)}
                  className="h-8 text-sm rounded-md border border-input bg-background px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All levels</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="rounded-xl border border-border bg-card h-16 animate-skeleton" />)}
                </div>
              ) : filteredQuizzes.length === 0 ? (
                <div className="rounded-xl border border-border bg-card py-14 text-center">
                  <Brain className="h-9 w-9 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium text-foreground text-sm">
                    {quizzes.length === 0 ? 'No quizzes yet' : 'No results'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 mb-5">
                    {quizzes.length === 0 ? 'Create your first quiz or generate one with AI' : 'Try a different filter or search term'}
                  </p>
                  {quizzes.length === 0 && aiAvailable && (
                    <Button onClick={() => router.push('/quizzes/generate')} size="sm">Generate AI Quiz</Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredQuizzes.map(quiz => (
                    <button
                      key={quiz._id}
                      onClick={() => router.push(`/quizzes/${quiz.id}`)}
                      className="w-full text-left rounded-xl border border-border bg-card hover:bg-muted/30 px-4 py-3.5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {quiz.generated_by === 'AI' && <Brain className="h-4 w-4 text-primary shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-card-foreground text-sm truncate">{quiz.title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 ${diffBadge(quiz.difficulty)}`}>
                              {quiz.difficulty}
                            </span>
                          </div>
                          {quiz.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{quiz.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                          <span>{quiz.questions?.length || 0} q</span>
                          <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{quiz.total_points}</span>
                          <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
