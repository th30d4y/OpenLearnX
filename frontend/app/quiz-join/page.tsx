'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Lock, Globe, Search, Play } from 'lucide-react'

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
    if (joinMode === 'public') {
      fetchPublicRooms()
    }
  }, [joinMode])

  const fetchPublicRooms = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/quizzes/public-rooms')
      const data = await response.json()
      
      if (data.success) {
        setPublicRooms(data.public_rooms)
      }
    } catch (error) {
      console.error('Failed to fetch public rooms:', error)
    }
  }

  const joinRoom = async (code: string) => {
    if (!username.trim()) {
      alert('Please enter your username')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://127.0.0.1:5000/api/quizzes/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: code,
          username: username.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        // Store session info and redirect to quiz
        localStorage.setItem('quiz_session', JSON.stringify(data.session))
        router.push(`/quiz-play/${data.session.session_id}`)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Network error: Could not join room')
    } finally {
      setLoading(false)
    }
  }

  const joinWithCode = () => {
    if (!roomCode.trim()) {
      alert('Please enter room code')
      return
    }
    joinRoom(roomCode.trim().toUpperCase())
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <Users className="h-16 w-16 text-blue-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">🎯 Join Quiz</h1>
          <p className="text-gray-400">
            Join an adaptive quiz and test your knowledge!
          </p>
        </div>

        {/* Username Input */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-4">👤 Enter Your Name</h2>
          <input
            type="text"
            placeholder="Your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            maxLength={20}
          />
        </div>

        {/* Join Mode Toggle */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setJoinMode('public')}
            className={`flex-1 p-4 rounded-lg flex items-center justify-center space-x-2 ${
              joinMode === 'public' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Globe className="h-5 w-5" />
            <span>Public Rooms</span>
          </button>
          <button
            onClick={() => setJoinMode('code')}
            className={`flex-1 p-4 rounded-lg flex items-center justify-center space-x-2 ${
              joinMode === 'code' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Lock className="h-5 w-5" />
            <span>Private Code</span>
          </button>
        </div>

        {/* Join with Code */}
        {joinMode === 'code' && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Lock className="h-5 w-5 text-yellow-400" />
              <span>🔐 Join with Room Code</span>
            </h2>
            
            <div className="flex space-x-4">
              <input
                type="text"
                placeholder="Enter room code (e.g., ABC123)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="flex-1 p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                maxLength={6}
              />
              <button
                onClick={joinWithCode}
                disabled={!username.trim() || !roomCode.trim() || loading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3 rounded font-semibold flex items-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Join</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Public Rooms */}
        {joinMode === 'public' && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center space-x-2">
                <Globe className="h-5 w-5 text-green-400" />
                <span>🌍 Public Quiz Rooms</span>
              </h2>
              <button
                onClick={fetchPublicRooms}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center space-x-2"
              >
                <Search className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>

            {publicRooms.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Globe className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl mb-2">No public rooms available</p>
                <p>Create your own room or join with a private code</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {publicRooms.map((room) => (
                  <div key={room.room_id} className="bg-gray-700 p-4 rounded-lg hover:bg-gray-650 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{room.title}</h3>
                        <p className="text-sm text-gray-400">Host: {room.host_name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        room.status === 'waiting' ? 'bg-yellow-900 text-yellow-400' : 'bg-green-900 text-green-400'
                      }`}>
                        {room.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-gray-400 mb-4">
                      <span>👥 {room.participants_count}/{room.max_participants}</span>
                      <span>❓ {room.questions_count} questions</span>
                      <span>🔢 {room.room_code}</span>
                    </div>

                    <button
                      onClick={() => joinRoom(room.room_code)}
                      disabled={!username.trim() || loading || room.participants_count >= room.max_participants}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 p-3 rounded font-semibold flex items-center justify-center space-x-2"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          <span>Join Quiz</span>
                        </>
                      )}
                    </button>
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
