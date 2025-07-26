'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  Users, 
  Trophy, 
  Clock, 
  Play, 
  Square, 
  UserMinus, 
  RefreshCw,
  Settings,
  Upload,
  Plus,
  Code,
  TestTube,
  AlertCircle,
  Check,
  Timer
} from 'lucide-react'

interface Question {
  id: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  function_name: string
  starter_code: Record<string, string>
  test_cases: TestCase[]
  examples: Example[]
  constraints: string[]
  time_limit?: number
  memory_limit?: string
}

interface TestCase {
  input: string
  expected_output: string
  description: string
  is_public: boolean
}

interface Example {
  input: string
  expected_output: string
  description: string
}

interface ExamInfo {
  title: string
  status: 'waiting' | 'active' | 'completed'
  duration_minutes: number
  participants_count: number
  max_participants: number
  problem_title: string
  problem_description?: string
  languages: string[]
  created_at: string
  host_name: string
}

interface Participant {
  name: string
  score: number
  completed: boolean
  joined_at: string
  submitted_at?: string
}

export default function HostPanel() {
  const params = useParams()
  const router = useRouter()
  const examCode = params.examCode as string

  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // ✅ NEW STATE - Tab management and question upload
  const [activeTab, setActiveTab] = useState<'overview'|'participants'|'questions'>('overview')
  const [showUploader, setShowUploader] = useState(false)
  const [customDuration, setCustomDuration] = useState(30)
  const [showDurationEdit, setShowDurationEdit] = useState(false)

  // ✅ Empty "question draft"
  const blankQuestion: Question = {
    id: '',
    title: '',
    description: '',
    difficulty: 'medium',
    function_name: 'solve',
    starter_code: { 
      python: 'def solve():\n    # Write your solution here\n    pass',
      java: 'public class Solution {\n    public void solve() {\n        // Write your solution here\n    }\n}',
      javascript: 'function solve() {\n    // Write your solution here\n}'
    },
    test_cases: [{ input:'', expected_output:'', description:'Test case 1', is_public:true }],
    examples: [{ input:'', expected_output:'', description:'Example 1' }],
    constraints: [''],
    time_limit: 1000,
    memory_limit: '128MB'
  }
  const [draft, setDraft] = useState<Question>(blankQuestion)

  useEffect(() => {
    if (examCode) {
      fetchExamInfo()
      fetchParticipants()
    }
  }, [examCode])

  const fetchExamInfo = async () => {
    try {
      console.log(`🔍 Fetching exam info for: ${examCode}`)
      
      const response = await fetch(`http://127.0.0.1:5000/api/exam/info/${examCode}`)
      const data = await response.json()
      
      console.log('📦 Exam info response:', data)
      
      if (data.success) {
        setExamInfo(data.exam_info)
        setCustomDuration(data.exam_info.duration_minutes)
        setError('')
      } else {
        setError(data.error || 'Failed to load exam information')
      }
    } catch (error) {
      console.error('❌ Error fetching exam info:', error)
      setError('Network error: Could not connect to backend')
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

  // ✅ UPLOAD HANDLER
  const uploadQuestion = async () => {
    if (!draft.title.trim() || !draft.description.trim()) {
      alert('Title & description are required')
      return
    }
    
    try {
      const res = await fetch('http://127.0.0.1:5000/api/exam/upload-question', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ exam_code: examCode, question: draft })
      })
      const data = await res.json()

      if (data.success) {
        alert('✅ Question saved')
        setShowUploader(false)
        setDraft(blankQuestion)
        fetchExamInfo() // refresh current question/name
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('❌ Network error occurred')
    }
  }

  // ✅ UPDATE DURATION
  const updateDuration = async () => {
    try {
      const res = await fetch('http://127.0.0.1:5000/api/exam/update-duration', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ exam_code: examCode, duration_minutes: customDuration })
      })
      const data = await res.json()

      if (data.success) {
        alert(`✅ Duration updated to ${customDuration} minutes`)
        setShowDurationEdit(false)
        fetchExamInfo()
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch (error) {
      alert('❌ Network error occurred')
    }
  }

  // ✅ ADD TEST CASE
  const addTestCase = () => {
    setDraft(prev => ({
      ...prev,
      test_cases: [
        ...prev.test_cases,
        {
          input: '',
          expected_output: '',
          description: `Test case ${prev.test_cases.length + 1}`,
          is_public: false
        }
      ]
    }))
  }

  // ✅ UPDATE TEST CASE
  const updateTestCase = (index: number, field: string, value: string | boolean) => {
    setDraft(prev => ({
      ...prev,
      test_cases: prev.test_cases.map((tc, i) => 
        i === index ? { ...tc, [field]: value } : tc
      )
    }))
  }

  // ✅ REMOVE TEST CASE
  const removeTestCase = (index: number) => {
    setDraft(prev => ({
      ...prev,
      test_cases: prev.test_cases.filter((_, i) => i !== index)
    }))
  }

  // ✅ START EXAM
  const startExam = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/exam/start-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_code: examCode })
      })
      
      const data = await response.json()
      if (data.success) {
        alert('✅ Exam started! Participants can now begin coding.')
        fetchExamInfo()
      } else {
        alert(`❌ Failed to start exam: ${data.error}`)
      }
    } catch (error) {
      alert('❌ Network error occurred')
    }
  }

  // ✅ STOP EXAM
  const stopExam = async () => {
    if (!confirm('Are you sure you want to stop the exam?')) return
    
    try {
      const response = await fetch('http://127.0.0.1:5000/api/exam/stop-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_code: examCode })
      })
      
      const data = await response.json()
      if (data.success) {
        alert('🛑 Exam stopped successfully!')
        fetchExamInfo()
      } else {
        alert(`❌ Failed to stop exam: ${data.error}`)
      }
    } catch (error) {
      alert('❌ Network error occurred')
    }
  }

  // ✅ REMOVE PARTICIPANT
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
        alert(`✅ Removed "${participantName}" from the exam`)
        fetchParticipants()
      } else {
        alert(`❌ Failed to remove participant: ${data.error}`)
      }
    } catch (error) {
      alert('❌ Network error occurred')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading host panel for exam: {examCode}</p>
        </div>
      </div>
    )
  }

  if (error || !examInfo) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error Loading Exam</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-4">Exam Code: {examCode}</p>
          
          <div className="space-y-2">
            <button
              onClick={fetchExamInfo}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mr-2"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/coding')}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
            >
              Back to Home
            </button>
          </div>
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
            <h1 className="text-2xl font-bold">Host Panel</h1>
            <p className="text-gray-400">Managing exam: {examCode}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              examInfo.status === 'waiting' ? 'bg-yellow-600' :
              examInfo.status === 'active' ? 'bg-green-600' : 'bg-red-600'
            }`}>
              {examInfo.status.toUpperCase()}
            </div>
          </div>
        </div>

        {/* ✅ TABS IN HEADER */}
        <div className="flex space-x-4 mt-4">
          {['overview','participants','questions'].map(t => (
            <button key={t}
              className={`px-4 py-2 rounded ${activeTab===t?'bg-blue-600':'bg-gray-700'}`}
              onClick={()=>setActiveTab(t as any)}
            >{t[0].toUpperCase()+t.slice(1)}</button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* ✅ OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
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
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-bold">{examInfo.duration_minutes}m</p>
                      {examInfo.status === 'waiting' && (
                        <button
                          onClick={() => setShowDurationEdit(true)}
                          className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center space-x-3">
                  <Trophy className="h-8 w-8 text-yellow-400" />
                  <div>
                    <p className="text-sm text-gray-400">Problem</p>
                    <p className="text-lg font-bold">{examInfo.problem_title}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center space-x-3">
                  <Settings className="h-8 w-8 text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-400">Host</p>
                    <p className="text-lg font-bold">{examInfo.host_name}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Control Panel */}
            <div className="bg-gray-800 rounded-lg p-6">
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
                  <button
                    onClick={stopExam}
                    className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded flex items-center space-x-2"
                  >
                    <Square className="h-4 w-4" />
                    <span>Stop Exam</span>
                  </button>
                )}
                
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(examCode)
                    alert('Exam code copied to clipboard!')
                  }}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded"
                >
                  Copy Exam Code
                </button>
                
                <button
                  onClick={fetchExamInfo}
                  className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh Data</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ✅ PARTICIPANTS TAB */}
        {activeTab === 'participants' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Participants ({participants.length})</h2>
              <button
                onClick={fetchParticipants}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
            
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
                    <tr key={index} className="border-b border-gray-700">
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
                          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs flex items-center space-x-1"
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
        )}

        {/* ✅ QUESTIONS TAB */}
        {activeTab==='questions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Question Management</h2>
              {examInfo.status === 'waiting' && (
                <button
                  onClick={()=>setShowUploader(true)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4"/><span>Upload / Replace Question</span>
                </button>
              )}
            </div>

            {/* Current problem quick view */}
            <div className="bg-gray-800 p-6 rounded">
              <h3 className="font-bold text-lg mb-2">{examInfo.problem_title}</h3>
              <p className="text-gray-300">{examInfo.problem_description || 'No description stored'}</p>
              {examInfo.status !== 'waiting' && (
                <p className="text-yellow-400 text-sm mt-2">
                  ⚠️ Questions cannot be modified after exam has started
                </p>
              )}
            </div>

            {/* ✅ UPLOAD MODAL */}
            {showUploader && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-gray-800 w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-lg p-6">
                  <div className="flex justify-between mb-6">
                    <h3 className="text-2xl font-bold">Upload Question</h3>
                    <button 
                      onClick={()=>setShowUploader(false)}
                      className="text-gray-400 hover:text-white text-2xl"
                    >✕</button>
                  </div>

                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Question Title *</label>
                        <input
                          className="w-full p-3 bg-gray-700 rounded border border-gray-600"
                          placeholder="e.g., Two Sum Problem"
                          value={draft.title}
                          onChange={e=>setDraft({...draft,title:e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Difficulty</label>
                        <select
                          value={draft.difficulty}
                          onChange={e=>setDraft({...draft,difficulty:e.target.value as any})}
                          className="w-full p-3 bg-gray-700 rounded border border-gray-600"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Problem Description *</label>
                      <textarea
                        className="w-full p-3 bg-gray-700 rounded border border-gray-600"
                        placeholder="Describe the problem clearly with examples..."
                        rows={5}
                        value={draft.description}
                        onChange={e=>setDraft({...draft,description:e.target.value})}
                      />
                    </div>

                    {/* Function Name */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Function Name</label>
                      <input
                        className="w-full p-3 bg-gray-700 rounded border border-gray-600"
                        placeholder="solve"
                        value={draft.function_name}
                        onChange={e=>setDraft({...draft,function_name:e.target.value})}
                      />
                    </div>

                    {/* Starter Code */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Starter Code (Python)</label>
                      <textarea
                        className="w-full p-3 bg-gray-900 text-green-400 font-mono rounded border border-gray-600"
                        rows={6}
                        value={draft.starter_code.python}
                        onChange={e=>setDraft({...draft,starter_code:{...draft.starter_code,python:e.target.value}})}
                      />
                    </div>

                    {/* Test Cases */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="block text-sm font-medium">Test Cases</label>
                        <button
                          onClick={addTestCase}
                          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center space-x-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add Test Case</span>
                        </button>
                      </div>

                      {draft.test_cases.map((testCase, index) => (
                        <div key={index} className="bg-gray-700 p-4 rounded mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Test Case {index + 1}</h4>
                            {draft.test_cases.length > 1 && (
                              <button
                                onClick={() => removeTestCase(index)}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Input</label>
                              <textarea
                                className="w-full p-2 bg-gray-600 rounded text-sm"
                                rows={2}
                                placeholder='e.g., "hello world"'
                                value={testCase.input}
                                onChange={e => updateTestCase(index, 'input', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Expected Output</label>
                              <textarea
                                className="w-full p-2 bg-gray-600 rounded text-sm"
                                rows={2}
                                placeholder='e.g., "HELLO WORLD"'
                                value={testCase.expected_output}
                                onChange={e => updateTestCase(index, 'expected_output', e.target.value)}
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={testCase.is_public}
                                onChange={e => updateTestCase(index, 'is_public', e.target.checked)}
                                className="rounded"
                              />
                              <span className="text-sm">Public (visible to students)</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-4 pt-4 border-t border-gray-600">
                      <button
                        onClick={uploadQuestion}
                        className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded flex items-center space-x-2"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Save Question</span>
                      </button>
                      
                      <button
                        onClick={() => setShowUploader(false)}
                        className="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ✅ DURATION EDIT MODAL */}
        {showDurationEdit && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Edit Exam Duration</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={customDuration}
                  onChange={e => setCustomDuration(parseInt(e.target.value) || 30)}
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600"
                />
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={updateDuration}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center space-x-2"
                >
                  <Timer className="h-4 w-4" />
                  <span>Update Duration</span>
                </button>
                
                <button
                  onClick={() => setShowDurationEdit(false)}
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
