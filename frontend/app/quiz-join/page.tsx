'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Lock, Globe, Search, Play, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PublicRoom {
  room_id: string
  room_code: string
  title: string
  host_name: string
  participants_count: number
  max_participants: number
  questions_count: number
  status: string
}

export default function QuizJoinPage() {
  const [joinMode, setJoinMode] = useState<'code' | 'public'>('public')
  const [roomCode, setRoomCode] = useState('')
  const [username, setUsername] = useState('')
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  React.useEffect(() => {
    if (joinMode === 'public') fetchPublicRooms()
  }, [joinMode])

  const fetchPublicRooms = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/quizzes/public-rooms')
      const data = await response.json()
      if (data.success) setPublicRooms(data.public_rooms)
    } catch {
      console.error('Failed to fetch public rooms')
    }
  }

  const joinRoom = async (code: string) => {
    if (!username.trim()) { alert('Please enter your username'); return }
    setLoading(true)
    try {
      const token = localStorage.getItem('openlearnx_jwt_token') || localStorage.getItem('openlearnx_token')
      const storedUser = JSON.parse(localStorage.getItem('openlearnx_user') || 'null')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`

      const response = await fetch('http://127.0.0.1:5000/api/quizzes/join-room', {
        method: 'POST',
        headers,
        body: JSON.stringify({ room_code: code, username: username.trim(), wallet_address: storedUser?.wallet_address, user_id: storedUser?.id }),
      })
      const data = await response.json()
      if (data.success) {
        localStorage.setItem('quiz_session', JSON.stringify(data.session))
        router.push(`/quiz-play/${data.session.session_id}`)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('Network error: Could not join room')
    } finally {
      setLoading(false)
    }
  }

  const joinWithCode = () => {
    if (!roomCode.trim()) { alert('Please enter room code'); return }
    joinRoom(roomCode.trim().toUpperCase())
  }

  const statusBadge = (s: string) => s === 'active'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto py-8 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Join Quiz</h1>
          <p className="mt-1 text-sm text-muted-foreground">Join an adaptive quiz and test your knowledge</p>
        </div>

        {/* Username */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="space-y-1.5">
            <Label htmlFor="username">Your username</Label>
            <Input id="username" type="text" placeholder="Enter your username" value={username}
              onChange={(e) => setUsername(e.target.value)} maxLength={20} />
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 border border-border rounded-lg p-1 bg-muted/30">
          <button
            onClick={() => setJoinMode('public')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${joinMode === 'public' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
          >
            <Globe className="h-4 w-4" /> Public Rooms
          </button>
          <button
            onClick={() => setJoinMode('code')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${joinMode === 'code' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
          >
            <Lock className="h-4 w-4" /> Private Code
          </button>
        </div>

        {/* Join with code */}
        {joinMode === 'code' && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-medium text-card-foreground mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" /> Join with Room Code
            </h2>
            <div className="flex gap-3">
              <Input
                placeholder="e.g. ABC123"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="font-mono tracking-widest text-center uppercase flex-1"
              />
              <Button onClick={joinWithCode} disabled={!username.trim() || !roomCode.trim() || loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Join
              </Button>
            </div>
          </div>
        )}

        {/* Public rooms */}
        {joinMode === 'public' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-foreground">Public Quiz Rooms</h2>
              <Button onClick={fetchPublicRooms} variant="ghost" size="sm" className="gap-2">
                <Search className="h-4 w-4" /> Refresh
              </Button>
            </div>

            {publicRooms.length === 0 ? (
              <div className="text-center py-16 rounded-xl border border-border bg-card">
                <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-foreground">No public rooms available</p>
                <p className="text-sm text-muted-foreground mt-1">Create your own room or join with a private code</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {publicRooms.map(room => (
                  <div key={room.room_id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-card-foreground">{room.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Host: {room.host_name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusBadge(room.status)}`}>{room.status}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{room.participants_count}/{room.max_participants} participants</span>
                      <span>{room.questions_count} questions</span>
                      <span className="font-mono">{room.room_code}</span>
                    </div>
                    <Button
                      onClick={() => joinRoom(room.room_code)}
                      disabled={!username.trim() || loading || room.participants_count >= room.max_participants}
                      className="w-full gap-2"
                      size="sm"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Join Quiz
                    </Button>
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
