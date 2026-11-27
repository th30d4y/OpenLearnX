'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Trash2, Play, Square, Brain, Crown, Target, Copy, Check, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Question {
  question_id: string
  question_text: string
  options: string[]
  correct_answer: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  explanation: string
}

interface Participant {
  session_id: string
  username: string
  score: number
  current_difficulty: string
  total_questions: number
  correct_answers: number
  status: string
}

interface QuizRoom {
  room_id: string
  room_code: string
  title: string
  host_name: string
  is_private: boolean
  status: string
  questions: Question[]
  participants: Participant[]
  max_participants: number
  duration_minutes: number
}

export default function QuizHostPanel() {
  const router = useRouter()
  const [currentRoom, setCurrentRoom] = useState<QuizRoom | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'questions'>('questions')
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [showAIGenerate, setShowAIGenerate] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)

  const copyCode = () => {
    if (!currentRoom) return
    navigator.clipboard.writeText(currentRoom.room_code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const [roomForm, setRoomForm] = useState({
    host_name: '',
    room_title: '',
    is_private: false,
    max_participants: 50,
    duration_minutes: 30,
  })

  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    points: 10,
    explanation: '',
  })

  const [aiForm, setAiForm] = useState({ topic: '', num_easy: 3, num_medium: 3, num_hard: 2 })

  const createRoom = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/quizzes/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomForm),
      })
      const data = await response.json()
      if (data.success) {
        setCurrentRoom({ ...data.room, status: data.room.status || 'waiting', participants: data.room.participants || [], questions: data.room.questions || [] })
        setActiveTab('questions')
        alert(`Room created! Code: ${data.room.room_code}`)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('Network error: Could not create room')
    }
  }

  const addQuestion = async () => {
    if (!currentRoom) return
    if (!questionForm.question_text || questionForm.options.some(o => !o.trim()) || !questionForm.correct_answer) {
      alert('Please fill all question fields')
      return
    }
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/room/${currentRoom.room_code}/add-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionForm),
      })
      const data = await response.json()
      if (data.success) {
        fetchRoomData()
        setShowAddQuestion(false)
        setQuestionForm({ question_text: '', options: ['', '', '', ''], correct_answer: '', difficulty: 'medium', points: 10, explanation: '' })
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('Network error: Could not add question')
    }
  }

  const generateAIQuestions = async () => {
    if (!currentRoom) return
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/room/${currentRoom.room_code}/generate-ai-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiForm),
      })
      const data = await response.json()
      if (data.success) {
        fetchRoomData()
        setShowAIGenerate(false)
        alert(`Generated ${data.questions.length} AI questions!`)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('Network error: Could not generate questions')
    }
  }

  const removeQuestion = async (questionId: string) => {
    if (!currentRoom || !confirm('Remove this question?')) return
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/room/${currentRoom.room_code}/remove-question/${questionId}`, { method: 'DELETE' })
      const data = await response.json()
      if (data.success) fetchRoomData()
      else alert(`Error: ${data.error}`)
    } catch {
      alert('Network error')
    }
  }

  const removeParticipant = async (username: string) => {
    if (!currentRoom || !confirm(`Remove ${username} from the quiz?`)) return
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/room/${currentRoom.room_code}/remove-participant/${username}`, { method: 'DELETE' })
      const data = await response.json()
      if (data.success) fetchRoomData()
      else alert(`Error: ${data.error}`)
    } catch {
      alert('Network error')
    }
  }

  const startQuiz = async () => {
    if (!currentRoom) return
    if ((currentRoom.questions?.length || 0) === 0) { alert('Add questions before starting!'); return }
    if (!confirm('Start the quiz now?')) return
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/room/${currentRoom.room_code}/start`, { method: 'POST' })
      const data = await response.json()
      if (data.success) { fetchRoomData(); setActiveTab('overview') }
      else alert(`Error: ${data.error}`)
    } catch {
      alert('Network error')
    }
  }

  const endQuiz = async () => {
    if (!currentRoom || !confirm('End the quiz now?')) return
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/room/${currentRoom.room_code}/end`, { method: 'POST' })
      const data = await response.json()
      if (data.success) fetchRoomData()
      else alert(`Error: ${data.error}`)
    } catch {
      alert('Network error')
    }
  }

  const fetchRoomData = async () => {
    if (!currentRoom) return
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/room/${currentRoom.room_code}/info`)
      const data = await response.json()
      if (data.success) setCurrentRoom(data.room)
    } catch {
      console.error('Failed to fetch room data')
    }
  }

  useEffect(() => {
    if (currentRoom?.status === 'active') {
      const interval = setInterval(fetchRoomData, 3000)
      return () => clearInterval(interval)
    }
  }, [currentRoom?.status])

  const difficultyBadge = (d: string) => {
    switch (d) {
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

  const roomStatus = currentRoom?.status || 'waiting'

  // Create room screen
  if (!currentRoom) {
    return (
      <div className="bg-background px-4 py-16">
        <div className="max-w-xl mx-auto">
          <div className="mb-8">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card mb-4">
              <Crown className="h-5 w-5 text-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Quiz Host Panel</h1>
            <p className="mt-1 text-sm text-muted-foreground">Create a room and invite participants to join</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold text-card-foreground">Create New Quiz Room</h2>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Your name (Host)</Label>
                <Input placeholder="Your name" value={roomForm.host_name} onChange={(e) => setRoomForm(p => ({...p, host_name: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label>Quiz room title</Label>
                <Input placeholder="Quiz room title" value={roomForm.room_title} onChange={(e) => setRoomForm(p => ({...p, room_title: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Max participants</Label>
                  <Input type="number" value={roomForm.max_participants} onChange={(e) => setRoomForm(p => ({...p, max_participants: parseInt(e.target.value) || 50}))} min="1" max="100" />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration (minutes)</Label>
                  <Input type="number" value={roomForm.duration_minutes} onChange={(e) => setRoomForm(p => ({...p, duration_minutes: parseInt(e.target.value) || 30}))} min="5" max="180" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={roomForm.is_private} onChange={(e) => setRoomForm(p => ({...p, is_private: e.target.checked}))} className="rounded" />
                Private room (requires code to join)
              </label>
              <Button onClick={createRoom} disabled={!roomForm.host_name || !roomForm.room_title} className="w-full" size="lg">
                Create Quiz Room
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Session bar */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push('/quizzes')} className="text-muted-foreground hover:text-foreground shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{currentRoom.title}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-mono text-sm font-semibold text-foreground">{currentRoom.room_code}</span>
              <button onClick={copyCode} className="text-muted-foreground hover:text-foreground transition-colors" title="Copy code">
                {codeCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`h-2 w-2 rounded-full ${roomStatus === 'active' ? 'bg-emerald-500' : roomStatus === 'waiting' ? 'bg-amber-500' : 'bg-muted-foreground'}`} />
              <span className="text-xs text-muted-foreground capitalize">{roomStatus}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {currentRoom.participants?.length || 0}/{currentRoom.max_participants} · {currentRoom.questions?.length || 0} questions
            </span>
            {roomStatus === 'waiting' && (
              <Button onClick={startQuiz} disabled={(currentRoom.questions?.length || 0) === 0} className="gap-1.5" size="sm">
                <Play className="h-3.5 w-3.5" /> Start
              </Button>
            )}
            {roomStatus === 'active' && (
              <Button onClick={endQuiz} variant="destructive" className="gap-1.5" size="sm">
                <Square className="h-3.5 w-3.5" /> End
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Tabs */}
        <div className="flex gap-1 border border-border rounded-lg p-1 w-fit mb-5 bg-muted/30">
          {[
            { id: 'overview', label: 'Overview', icon: Play },
            { id: 'participants', label: `Participants (${currentRoom.participants?.length || 0})`, icon: Users },
            { id: 'questions', label: `Questions (${currentRoom.questions?.length || 0})`, icon: Target },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Questions tab */}
        {activeTab === 'questions' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-foreground">Question Management</h2>
              <div className="flex gap-2">
                <Button onClick={() => setShowAIGenerate(true)} variant="outline" size="sm" className="gap-2">
                  <Brain className="h-4 w-4" /> AI Generate
                </Button>
                <Button onClick={() => setShowAddQuestion(true)} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Add Question
                </Button>
              </div>
            </div>

            {(['easy', 'medium', 'hard'] as const).map(diff => {
              const qs = (currentRoom.questions || []).filter(q => q.difficulty === diff)
              return (
                <div key={diff}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${difficultyBadge(diff)}`}>{diff}</span>
                    <span className="text-xs text-muted-foreground">({qs.length} questions)</span>
                  </div>
                  <div className="space-y-2">
                    {qs.map(q => (
                      <div key={q.question_id} className="rounded-lg border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-card-foreground text-sm">{q.question_text}</p>
                            <div className="grid grid-cols-2 gap-1 mt-2 text-xs text-muted-foreground">
                              {q.options.map((o, i) => (
                                <span key={i} className={o === q.correct_answer ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                                  {String.fromCharCode(65+i)}) {o}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Points: {q.points}</p>
                          </div>
                          <button onClick={() => removeQuestion(q.question_id)} disabled={roomStatus !== 'waiting'} className="text-muted-foreground hover:text-destructive disabled:opacity-30 shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {qs.length === 0 && (
                      <div className="text-center py-4 text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg">
                        No {diff} questions yet
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Add Question Modal */}
            {showAddQuestion && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="rounded-xl border border-border bg-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <h3 className="font-semibold text-card-foreground mb-4">Add New Question</h3>
                  <div className="space-y-3">
                    <textarea placeholder="Question text" value={questionForm.question_text}
                      onChange={(e) => setQuestionForm(p => ({...p, question_text: e.target.value}))}
                      className="w-full p-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" rows={3} />
                    <div className="space-y-2">
                      <Label>Options</Label>
                      {questionForm.options.map((o, i) => (
                        <Input key={i} placeholder={`Option ${String.fromCharCode(65+i)}`} value={o}
                          onChange={(e) => { const opts = [...questionForm.options]; opts[i] = e.target.value; setQuestionForm(p => ({...p, options: opts})) }} />
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label>Correct answer</Label>
                        <Input placeholder="Correct answer" value={questionForm.correct_answer} onChange={(e) => setQuestionForm(p => ({...p, correct_answer: e.target.value}))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Difficulty</Label>
                        <select value={questionForm.difficulty} onChange={(e) => setQuestionForm(p => ({...p, difficulty: e.target.value as any}))}
                          className="w-full p-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Points</Label>
                        <Input type="number" value={questionForm.points} onChange={(e) => setQuestionForm(p => ({...p, points: parseInt(e.target.value) || 10}))} min="1" />
                      </div>
                    </div>
                    <textarea placeholder="Explanation (optional)" value={questionForm.explanation}
                      onChange={(e) => setQuestionForm(p => ({...p, explanation: e.target.value}))}
                      className="w-full p-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" rows={2} />
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button onClick={addQuestion}>Add Question</Button>
                    <Button onClick={() => setShowAddQuestion(false)} variant="outline">Cancel</Button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Generate Modal */}
            {showAIGenerate && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="rounded-xl border border-border bg-card p-6 max-w-md w-full">
                  <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" /> AI Question Generator
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Topic</Label>
                      <Input placeholder="e.g. Programming, Science" value={aiForm.topic} onChange={(e) => setAiForm(p => ({...p, topic: e.target.value}))} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[{key: 'num_easy', label: 'Easy'}, {key: 'num_medium', label: 'Medium'}, {key: 'num_hard', label: 'Hard'}].map(({key, label}) => (
                        <div key={key} className="space-y-1.5">
                          <Label>{label}</Label>
                          <Input type="number" value={(aiForm as any)[key]}
                            onChange={(e) => setAiForm(p => ({...p, [key]: parseInt(e.target.value) || 0}))} min="0" max="10" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button onClick={generateAIQuestions} disabled={aiForm.num_easy + aiForm.num_medium + aiForm.num_hard === 0}>Generate</Button>
                    <Button onClick={() => setShowAIGenerate(false)} variant="outline">Cancel</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Participants tab */}
        {activeTab === 'participants' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-foreground">Participant Management</h2>
            {(currentRoom.participants?.length || 0) === 0 ? (
              <div className="text-center py-16 rounded-xl border border-border bg-card">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-foreground">No participants yet</p>
                <p className="text-sm text-muted-foreground mt-1">Share room code: <span className="font-mono font-semibold text-primary">{currentRoom.room_code}</span></p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(currentRoom.participants || []).map(p => (
                  <div key={p.session_id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-card-foreground">{p.username}</p>
                        <p className="text-sm text-muted-foreground">{p.score} pts</p>
                      </div>
                      <button onClick={() => removeParticipant(p.username)} disabled={roomStatus === 'active'} className="text-muted-foreground hover:text-destructive disabled:opacity-30">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Level</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${difficultyBadge(p.current_difficulty)}`}>{p.current_difficulty}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-foreground">{p.correct_answers}/{p.total_questions}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <h2 className="font-semibold text-foreground">Session Overview</h2>
            {roomStatus !== 'active' ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-card-foreground">Room ready</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    {[
                      { label: 'Questions', value: currentRoom.questions?.length || 0 },
                      { label: 'Participants', value: currentRoom.participants?.length || 0 },
                      { label: 'Max capacity', value: currentRoom.max_participants },
                      { label: 'Duration', value: `${currentRoom.duration_minutes}m` },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xl font-bold text-foreground">{value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share code <span className="font-mono font-semibold text-foreground">{currentRoom.room_code}</span> for participants to join, then start when ready.
                  </p>
                </div>
                {(currentRoom.questions?.length || 0) === 0 && (
                  <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
                    <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">No questions yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Go to the Questions tab to add or generate questions</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Active Participants', value: currentRoom.participants?.length || 0, color: 'text-primary' },
                    {
                      label: 'Avg Accuracy', value: `${Math.round((currentRoom.participants || []).reduce((s, p) => s + (p.total_questions > 0 ? (p.correct_answers/p.total_questions)*100 : 0), 0) / Math.max((currentRoom.participants || []).length, 1))}%`,
                      color: 'text-emerald-600 dark:text-emerald-400'
                    },
                    { label: 'Top Score', value: Math.max(...(currentRoom.participants || []).map(p => p.score), 0), color: 'text-amber-600 dark:text-amber-400' },
                    { label: 'On Hard Level', value: (currentRoom.participants || []).filter(p => p.current_difficulty === 'hard').length, color: 'text-red-600 dark:text-red-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
                      <p className={`text-2xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-semibold text-card-foreground mb-4">Live Leaderboard</h3>
                  <div className="space-y-2">
                    {(currentRoom.participants || []).sort((a, b) => b.score - a.score).map((p, i) => (
                      <div key={p.session_id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
                            {i+1}
                          </span>
                          <span className="font-medium text-foreground">{p.username}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${difficultyBadge(p.current_difficulty)}`}>{p.current_difficulty}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">{p.score} pts</p>
                          <p className="text-xs text-muted-foreground">{p.correct_answers}/{p.total_questions} correct</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
