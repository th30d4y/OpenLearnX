'use client'
import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Users, Trophy, Clock, Play, Square, UserX, AlertTriangle, 
  RefreshCw, Settings, BarChart, Eye, Trash2, Plus, Timer
} from 'lucide-react'

interface Participant {
  name: string
  joined_at: string
  score: number
  completed: boolean
  language?: string
  submission_time?: string
  rank?: number
  kicked?: boolean
}

interface ExamData {
  exam_info: {
    exam_code: string
    title: string
    status: string
    duration_minutes: number
    max_participants: number
    time_elapsed: number
    time_remaining: number
    start_time?: string
    end_time?: string
  }
  participants: {
    total: number
    completed: number
    working: number
    all_participants: Participant[]
    recent_joins: Participant[]
  }
  leaderboard: Participant[]
  statistics: {
    average_score: number
    highest_score: number
    lowest_score: number
    completion_rate: number
  }
}

export default function HostDashboard() {
  const params = useParams()
  const router = useRouter()
  const examCode = params.examCode as string

  const [examData, setExamData] = useState<ExamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'leaderboard' | 'settings'>('overview')
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null)
  const [showKickModal, setShowKickModal] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(3000) // 3 seconds

  useEffect(() => {
    if (!examCode) return

    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, refreshInterval)
    return () => clearInterval(interval)
  }, [examCode, refreshInterval])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/exam/host-dashboard/${examCode}`)
      const data = await response.json()
      
      if (data.success) {
        setExamData(data)
      } else {
        console.error('Failed to fetch dashboard data:', data.error)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
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
        alert('Exam started successfully!')
        fetchDashboardData()
      } else {
        alert(`Failed to start exam: ${data.error}`)
      }
    } catch (error) {
      alert('Failed to start exam')
    }
  }

  const endExam = async () => {
    if (!confirm('Are you sure you want to end the exam? This cannot be undone.')) return

    try {
      const response = await fetch('http://127.0.0.1:5000/api/exam/end-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_code: examCode })
      })

      const data = await response.json()
      if (data.success) {
        alert('Exam ended successfully!')
        fetchDashboardData()
      } else {
        alert(`Failed to end exam: ${data.error}`)
      }
    } catch (error) {
      alert('Failed to end exam')
    }
  }

  const extendExam = async (minutes: number) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/exam/extend-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          exam_code: examCode,
          additional_minutes: minutes
        })
      })

      const data = await response.json()
      if (data.success) {
        alert(`Exam extended by ${minutes} minutes!`)
        fetchDashboardData()
      } else {
        alert(`Failed to extend exam: ${data.error}`)
      }
    } catch (error) {
      alert('Failed to extend exam')
    }
  }

  const removeParticipant = async (participantName: string) => {
    if (!confirm(`Are you sure you want to remove "${participantName}" from the exam?`)) return

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
        alert(`Participant "${participantName}" removed successfully!`)
        fetchDashboardData()
        setShowKickModal(false)
        setSelectedParticipant(null)
      } else {
        alert(`Failed to remove participant: ${data.error}`)
      }
    } catch (error) {
      alert('Failed to remove participant')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading host dashboard...</p>
        </div>
      </div>
    )
  }

  if (!examData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Exam Not Found</h2>
          <p className="text-gray-400">The exam code "{examCode}" is invalid or expired.</p>
          <button
            onClick={() => router.push('/coding/create')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Create New Exam
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">{examData.exam_info.title}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-lg font-mono font-bold text-blue-400">
                  CODE: {examData.exam_info.exam_code}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(examData.exam_info.status)}`}>
                  {examData.exam_info.status.toUpperCase()}
                </span>
                <span className="text-gray-400">
                  {examData.participants.total}/{examData.exam_info.max_participants} participants
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Timer */}
              {examData.exam_info.status === 'active' && examData.exam_info.time_remaining > 0 && (
                <div className="flex items-center space-x-2 bg-red-900 px-4 py-2 rounded-lg">
                  <Clock className="h-5 w-5 text-red-400" />
                  <span className="font-mono text-lg">{formatTime(examData.exam_info.time_remaining)}</span>
                </div>
              )}

              {/* Control Buttons */}
              {examData.exam_info.status === 'waiting' && (
                <button
                  onClick={startExam}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>Start Exam</span>
                </button>
              )}

              {examData.exam_info.status === 'active' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => extendExam(10)}
                    className="bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded flex items-center space-x-1"
                  >
                    <Timer className="h-4 w-4" />
                    <span>+10min</span>
                  </button>
                  <button
                    onClick={endExam}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center space-x-2"
                  >
                    <Square className="h-4 w-4" />
                    <span>End Exam</span>
                  </button>
                </div>
              )}

              <button
                onClick={fetchDashboardData}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart },
            { id: 'participants', label: 'Participants', icon: Users },
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Total Participants</h3>
                    <p className="text-3xl font-bold text-blue-400">{examData.participants.total}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Completed</h3>
                    <p className="text-3xl font-bold text-green-400">{examData.participants.completed}</p>
                  </div>
                  <Trophy className="h-8 w-8 text-green-400" />
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Still Working</h3>
                    <p className="text-3xl font-bold text-yellow-400">{examData.participants.working}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-400" />
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Average Score</h3>
                    <p className="text-3xl font-bold text-purple-400">
                      {Math.round(examData.statistics.average_score)}%
                    </p>
                  </div>
                  <BarChart className="h-8 w-8 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Recent Participants</h3>
              <div className="space-y-2">
                {examData.participants.recent_joins.slice(0, 5).map((participant, index) => (
                  <div key={participant.name} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{participant.name}</div>
                        <div className="text-sm text-gray-400">
                          Joined {new Date(participant.joined_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-2 py-1 rounded text-xs ${
                        participant.completed ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'
                      }`}>
                        {participant.completed ? `${participant.score}% completed` : 'Working'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">All Participants ({examData.participants.total})</h3>
                <div className="text-sm text-gray-400">
                  Completion Rate: {Math.round(examData.statistics.completion_rate)}%
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Participant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Language</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {examData.participants.all_participants.map((participant) => (
                    <tr key={participant.name} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                            {participant.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="font-medium">{participant.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          participant.completed 
                            ? 'bg-green-900 text-green-200' 
                            : participant.kicked
                            ? 'bg-red-900 text-red-200'
                            : 'bg-yellow-900 text-yellow-200'
                        }`}>
                          {participant.kicked ? 'Kicked' : participant.completed ? 'Completed' : 'Working'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {participant.completed ? `${participant.score}%` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {participant.language || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(participant.joined_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedParticipant(participant.name)
                              setShowKickModal(true)
                            }}
                            className="text-red-400 hover:text-red-300"
                            title="Remove Participant"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-6">Live Leaderboard</h3>
            <div className="space-y-3">
              {examData.leaderboard.map((participant, index) => {
                const rankColors = {
                  1: 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-white',
                  2: 'bg-gradient-to-r from-gray-400 to-gray-500 text-white',
                  3: 'bg-gradient-to-r from-orange-600 to-orange-500 text-white'
                }
                
                return (
                  <div
                    key={participant.name}
                    className={`p-4 rounded-lg ${
                      rankColors[participant.rank as keyof typeof rankColors] || 'bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl font-bold">#{participant.rank}</div>
                        <div>
                          <div className="font-bold text-lg">{participant.name}</div>
                          <div className="text-sm opacity-75">
                            {participant.language && `${participant.language} • `}
                            Submitted: {new Date(participant.submission_time!).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{participant.score}%</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Exam Controls</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => extendExam(5)}
                  disabled={examData.exam_info.status !== 'active'}
                  className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 px-4 py-2 rounded text-left"
                >
                  <div className="font-medium">Extend by 5 minutes</div>
                  <div className="text-sm opacity-75">Add more time to the exam</div>
                </button>

                <button
                  onClick={() => extendExam(15)}
                  disabled={examData.exam_info.status !== 'active'}
                  className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 px-4 py-2 rounded text-left"
                >
                  <div className="font-medium">Extend by 15 minutes</div>
                  <div className="text-sm opacity-75">Add significant extra time</div>
                </button>

                <button
                  onClick={endExam}
                  disabled={examData.exam_info.status !== 'active'}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-4 py-2 rounded text-left"
                >
                  <div className="font-medium">End Exam Early</div>
                  <div className="text-sm opacity-75">Stop the exam immediately</div>
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Auto-Refresh Settings</h3>
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium">Update Interval:</label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
                >
                  <option value={1000}>1 second</option>
                  <option value={3000}>3 seconds</option>
                  <option value={5000}>5 seconds</option>
                  <option value={10000}>10 seconds</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Kick Participant Modal */}
      {showKickModal && selectedParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Remove Participant</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to remove <strong>"{selectedParticipant}"</strong> from the exam?
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowKickModal(false)
                  setSelectedParticipant(null)
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => removeParticipant(selectedParticipant)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
              >
                Remove Participant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
