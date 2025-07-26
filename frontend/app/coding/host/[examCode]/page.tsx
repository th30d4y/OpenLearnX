'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  Users, 
  Trophy, 
  Clock, 
  Play, 
  Pause, 
  Square, 
  UserMinus, 
  RefreshCw,
  Settings,
  Monitor,
  AlertCircle
} from 'lucide-react'

interface Participant {
  name: string
  score: number
  completed: boolean
  submitted_at?: string
  joined_at: string
}

interface ExamInfo {
  title: string
  status: 'waiting' | 'active' | 'completed'
  duration_minutes: number
  participants_count: number
  max_participants: number
  problem_title: string
  languages: string[]
  created_at: string
  host_name: string
}

export default function HostPanel() {
  const params = useParams()
  const router = useRouter()
  const examCode = params.examCode as string

  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [leaderboard, setLeaderboard] = useState<Participant[]>([])
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (examCode) {
      fetchExamInfo()
      fetchParticipants()
      fetchLeaderboard()
      
      // Auto-refresh every 5 seconds
      const interval = setInterval(() => {
        fetchParticipants()
        fetchLeaderboard()
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [examCode])

  const fetchExamInfo = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/exam/info/${examCode}`)
      const data = await response.json()
      
      if (data.success) {
        setExamInfo(data.exam_info)
        if (data.exam_info.status === 'active') {
          startTimer(data.exam_info.duration_minutes * 60)
        }
      } else {
        setError('Failed to load exam information')
      }
    } catch (error) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const fetchParticipants = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/exam/participants/${examCode}`)
      const data = await response.json()
      
      if (data.success) {
        setParticipants(data.participants)
      }
    } catch (error) {
      console.error('Failed to fetch participants')
    }
  }

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/exam/leaderboard/${examCode}`)
      const data = await response.json()
      
      if (data.success) {
        setLeaderboard(data.leaderboard)
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard')
    }
  }

  const startExam = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/exam/start-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_code: examCode })
      })
      
      const data = await response.json()
      if (data.success) {
        setExamInfo(prev => prev ? { ...prev, status: 'active' } : null)
        startTimer(examInfo?.duration_minutes ? examInfo.duration_minutes * 60 : 1800)
        alert('✅ Exam started! Participants can now begin coding.')
      } else {
        alert(`❌ Failed to start exam: ${data.error}`)
      }
    } catch (error) {
      alert('❌ Network error occurred')
    }
  }

  const stopExam = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/exam/stop-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_code: examCode })
      })
      
      const data = await response.json()
      if (data.success) {
        setExamInfo(prev => prev ? { ...prev, status: 'completed' } : null)
        setTimeRemaining(0)
        alert('🛑 Exam stopped successfully!')
      } else {
        alert(`❌ Failed to stop exam: ${data.error}`)
      }
    } catch (error) {
      alert('❌ Network error occurred')
    }
  }

  const removeParticipant = async (participantName: string) => {
    if (!confirm(`Are you sure you want to remove "${participantName}" from the exam?`)) {
      return
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/api/exam/remove-participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          exam_code: examCode,
          participant_name: participantName
        })
      })
      
      const data = await response.json()
      if (data.success) {
        alert(`✅ Removed "${participantName}" from the exam`)
        fetchParticipants()
        fetchLeaderboard()
      } else {
        alert(`❌ Failed to remove participant: ${data.error}`)
      }
    } catch (error) {
      alert('❌ Network error occurred')
    }
  }

  const startTimer = (seconds: number) => {
    setTimeRemaining(seconds)
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          alert('⏰ Time is up! Exam has ended.')
          setExamInfo(prev => prev ? { ...prev, status: 'completed' } : null)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-600'
      case 'active': return 'bg-green-600'
      case 'completed': return 'bg-red-600'
      default: return 'bg-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading host panel...</p>
        </div>
      </div>
    )
  }

  if (error || !examInfo) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-gray-400 mb-4">{error || 'Exam not found'}</p>
          <button
            onClick={() => router.push('/coding')}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center space-x-2">
              <Monitor className="h-6 w-6" />
              <span>Host Panel</span>
            </h1>
            <p className="text-gray-400">Managing exam: {examCode}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(examInfo.status)}`}>
              {examInfo.status.toUpperCase()}
            </div>
            
            {timeRemaining > 0 && (
              <div className="flex items-center space-x-2 bg-gray-700 px-3 py-1 rounded">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Exam Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-sm text-gray-400">Participants</p>
                  <p className="text-2xl font-bold">{examInfo.participants_count}/{examInfo.max_participants}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <Clock className="h-8 w-8 text-green-400" />
                <div>
                  <p className="text-sm text-gray-400">Duration</p>
                  <p className="text-2xl font-bold">{examInfo.duration_minutes}m</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <Trophy className="h-8 w-8 text-yellow-400" />
                <div>
                  <p className="text-sm text-gray-400">Completed</p>
                  <p className="text-2xl font-bold">{leaderboard.filter(p => p.completed).length}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <Settings className="h-8 w-8 text-purple-400" />
                <div>
                  <p className="text-sm text-gray-400">Problem</p>
                  <p className="text-lg font-bold">{examInfo.problem_title}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Exam Controls</h2>
            
            <div className="flex space-x-4">
              {examInfo.status === 'waiting' && (
                <button
                  onClick={startExam}
                  className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded flex items-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>Start Exam</span>
                </button>
              )}

              {examInfo.status === 'active' && (
                <>
                  <button
                    onClick={stopExam}
                    className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded flex items-center space-x-2"
                  >
                    <Square className="h-4 w-4" />
                    <span>Stop Exam</span>
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  fetchParticipants()
                  fetchLeaderboard()
                }}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh Data</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(examCode)
                  alert('Exam code copied to clipboard!')
                }}
                className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded"
              >
                Copy Exam Code
              </button>
            </div>
          </div>

          {/* Participants List */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Participants ({participants.length})</span>
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Joined At</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Score</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                      <td className="py-3 px-4 font-medium">{participant.name}</td>
                      <td className="py-3 px-4 text-gray-400">
                        {new Date(participant.joined_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          participant.completed 
                            ? 'bg-green-600 text-white' 
                            : 'bg-yellow-600 text-white'
                        }`}>
                          {participant.completed ? 'Completed' : 'In Progress'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {participant.completed ? (
                          <span className="font-bold text-green-400">{participant.score}%</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => removeParticipant(participant.name)}
                          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm flex items-center space-x-1"
                        >
                          <UserMinus className="h-3 w-3" />
                          <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {participants.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No participants have joined yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Leaderboard Sidebar */}
        <div className="w-80 bg-gray-800 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Trophy className="h-6 w-6 text-yellow-400" />
            <h2 className="text-xl font-bold">Live Leaderboard</h2>
          </div>
          
          <div className="space-y-3">
            {leaderboard.map((participant, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg ${
                  index === 0 ? 'bg-gradient-to-r from-yellow-600 to-orange-600' :
                  index === 1 ? 'bg-gradient-to-r from-gray-600 to-gray-500' :
                  index === 2 ? 'bg-gradient-to-r from-orange-600 to-red-600' :
                  'bg-gray-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-lg">#{index + 1}</span>
                      <span className="font-medium">{participant.name}</span>
                    </div>
                    {participant.submitted_at && (
                      <p className="text-xs text-gray-300 mt-1">
                        Submitted: {new Date(participant.submitted_at).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{participant.score}%</div>
                    <div className={`text-xs ${participant.completed ? 'text-green-300' : 'text-yellow-300'}`}>
                      {participant.completed ? 'Completed' : 'In Progress'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {leaderboard.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No submissions yet.
            </div>
          )}
          
          <button
            onClick={fetchLeaderboard}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm flex items-center justify-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh Leaderboard</span>
          </button>
        </div>
      </div>
    </div>
  )
}
