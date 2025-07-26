'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Users, Trophy, Clock, Play, Square, RefreshCw, Settings,
  Upload, Plus, UserMinus, AlertCircle, Timer, TestTube, Award
} from 'lucide-react'

/* ---------- Enhanced Models ---------- */
interface TestCase {
  input: string
  expected_output: string
  description: string
  is_public: boolean
  points: number
}

interface Example {
  input: string
  expected_output: string
  description: string
}

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
  correct_solution: Record<string, string>
  scoring_method: string
  total_points: number
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
  passed_tests?: number
  total_tests?: number
  points_earned?: number
  total_points?: number
}

/* ---------- Enhanced Host Panel Component ---------- */
export default function EnhancedHostPanel() {
  const params = useParams()
  const router = useRouter()
  const examCode = params.examCode as string

  /* ------- Global state ------- */
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /* ------- UI state ------- */
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'questions'>('overview')
  const [showUploader, setShowUploader] = useState(false)
  const [showDurationEdit, setShowDurationEdit] = useState(false)
  const [customDuration, setCustomDuration] = useState(30)

  /* ------- Enhanced Question draft ------- */
  const blankQuestion: Question = {
    id: '',
    title: '',
    description: '',
    difficulty: 'medium',
    function_name: 'solve',
    starter_code: {
      python: 'def solve():\n    # Write your solution here\n    pass',
      java: 'public class Solution {\n    public void solve() {\n        // Write your solution here\n    }\n}',
      javascript: 'function solve() {\n  // Write your solution here\n}'
    },
    test_cases: [{
      input: '',
      expected_output: '',
      description: 'Test case 1',
      is_public: true,
      points: 25
    }],
    examples: [{
      input: '',
      expected_output: '',
      description: 'Example 1'
    }],
    constraints: [''],
    time_limit: 1000,
    memory_limit: '128MB',
    correct_solution: {
      python: '',
      java: '',
      javascript: ''
    },
    scoring_method: 'test_cases',
    total_points: 100
  }
  const [draft, setDraft] = useState<Question>({ ...blankQuestion })

  /* ------------------------------------------------------------------- */
  /*                             API CALLS                               */
  /* ------------------------------------------------------------------- */
  const fetchExamInfo = async () => {
    setLoading(true)
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/exam/info/${examCode}`)
      const data = await res.json()
      if (data.success) {
        setExamInfo(data.exam_info)
        setCustomDuration(data.exam_info.duration_minutes)
        setError('')
      } else {
        setError(data.error || 'Unable to load exam')
      }
    } catch {
      setError('Backend unreachable')
    } finally {
      setLoading(false)
    }
  }

  const fetchParticipants = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/exam/participants/${examCode}`)
      const data = await res.json()
      if (data.success) setParticipants(data.participants)
    } catch {
      /** ignore */
    }
  }

  useEffect(() => {
    fetchExamInfo()
    fetchParticipants()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examCode])

  /* ---------- Enhanced Question Upload ---------- */
  const uploadQuestion = async () => {
    if (!draft.title.trim() || !draft.description.trim()) {
      alert('Title & description required')
      return
    }

    // Validate test cases
    const validTestCases = draft.test_cases.filter(tc => 
      tc.expected_output.trim() !== ''
    )
    
    if (validTestCases.length === 0) {
      alert('At least one test case with expected output is required')
      return
    }

    // Ensure points add up to total
    const totalTestPoints = validTestCases.reduce((sum, tc) => sum + tc.points, 0)
    if (totalTestPoints !== draft.total_points) {
      if (!confirm(`Test case points (${totalTestPoints}) don't equal total points (${draft.total_points}). Continue anyway?`)) {
        return
      }
    }

    try {
      const enhancedQuestion = {
        ...draft,
        test_cases: validTestCases,
        id: Date.now().toString()
      }

      const res = await fetch('http://127.0.0.1:5000/api/exam/upload-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          exam_code: examCode, 
          question: enhancedQuestion 
        })
      })
      const data = await res.json()
      
      if (data.success) {
        alert(`✅ Enhanced question uploaded with ${validTestCases.length} test cases!`)
        setShowUploader(false)
        setDraft({ ...blankQuestion })
        fetchExamInfo()
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch {
      alert('❌ Network error')
    }
  }

  /* ---------- Test Case Management ---------- */
  const addTestCase = () => {
    const newPoints = Math.floor(draft.total_points / (draft.test_cases.length + 1))
    setDraft(prev => ({
      ...prev,
      test_cases: [...prev.test_cases, {
        input: '',
        expected_output: '',
        description: `Test case ${prev.test_cases.length + 1}`,
        is_public: false,
        points: newPoints
      }]
    }))
  }

  const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
    setDraft(prev => ({
      ...prev,
      test_cases: prev.test_cases.map((tc, i) => 
        i === index ? { ...tc, [field]: value } : tc
      )
    }))
  }

  const removeTestCase = (index: number) => {
    if (draft.test_cases.length <= 1) {
      alert('At least one test case is required')
      return
    }
    setDraft(prev => ({
      ...prev,
      test_cases: prev.test_cases.filter((_, i) => i !== index)
    }))
  }

  /* ---------- Duration Update ---------- */
  const updateDuration = async () => {
    if (customDuration < 5) { 
      alert('Minimum 5 minutes')
      return 
    }
    try {
      const res = await fetch('http://127.0.0.1:5000/api/exam/update-duration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_code: examCode, duration_minutes: customDuration })
      })
      const data = await res.json()
      if (data.success) {
        alert('✅ Duration updated')
        setShowDurationEdit(false)
        fetchExamInfo()
      } else alert(`❌ ${data.error}`)
    } catch { 
      alert('❌ Network error') 
    }
  }

  /* ---------- Enhanced Question Upload Form ---------- */
  const EnhancedQuestionUploadForm = () => (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold flex items-center space-x-2">
          <TestTube className="h-5 w-5 text-green-400" />
          <span>📝 Create Question with Dynamic Scoring</span>
        </h3>
        <button
          onClick={() => setShowUploader(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      {/* Basic Question Info */}
      <div className="space-y-4 mb-6">
        <input
          type="text"
          placeholder="Question Title"
          value={draft.title}
          onChange={(e) => setDraft(prev => ({...prev, title: e.target.value}))}
          className="w-full p-3 bg-gray-700 rounded border border-gray-600"
        />
        
        <textarea
          placeholder="Question Description"
          value={draft.description}
          onChange={(e) => setDraft(prev => ({...prev, description: e.target.value}))}
          className="w-full p-3 bg-gray-700 rounded border border-gray-600 h-32"
        />

        <div className="grid grid-cols-2 gap-4">
          <select
            value={draft.difficulty}
            onChange={(e) => setDraft(prev => ({...prev, difficulty: e.target.value as any}))}
            className="p-3 bg-gray-700 rounded border border-gray-600"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          
          <input
            type="number"
            value={draft.total_points}
            onChange={(e) => setDraft(prev => ({...prev, total_points: parseInt(e.target.value) || 100}))}
            className="p-3 bg-gray-700 rounded border border-gray-600"
            placeholder="Total Points"
          />
        </div>
      </div>

      {/* Host's Correct Solution */}
      <div className="mb-6">
        <h4 className="font-medium mb-2 flex items-center space-x-2">
          <Award className="h-4 w-4 text-gold-400" />
          <span>✅ Your Correct Solution (Python):</span>
        </h4>
        <textarea
          placeholder="Enter your correct solution here..."
          value={draft.correct_solution.python}
          onChange={(e) => setDraft(prev => ({
            ...prev,
            correct_solution: {...prev.correct_solution, python: e.target.value}
          }))}
          className="w-full p-3 bg-gray-900 text-green-400 font-mono rounded border border-gray-600 h-32"
        />
      </div>

      {/* Test Cases */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium flex items-center space-x-2">
            <TestTube className="h-4 w-4 text-blue-400" />
            <span>🧪 Test Cases for Dynamic Scoring</span>
          </h4>
          <button
            onClick={addTestCase}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm flex items-center space-x-1"
          >
            <Plus className="h-4 w-4" />
            <span>Add Test Case</span>
          </button>
        </div>
        
        {draft.test_cases.map((testCase, index) => (
          <div key={index} className="bg-gray-900 p-4 rounded mb-3 border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium text-blue-300">Test Case {index + 1}</span>
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    checked={testCase.is_public}
                    onChange={(e) => updateTestCase(index, 'is_public', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Public</span>
                </label>
                <input
                  type="number"
                  value={testCase.points}
                  onChange={(e) => updateTestCase(index, 'points', parseInt(e.target.value) || 0)}
                  className="w-20 p-1 bg-gray-700 rounded text-sm border border-gray-600"
                  placeholder="Points"
                />
                {draft.test_cases.length > 1 && (
                  <button
                    onClick={() => removeTestCase(index)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm mb-1">Input:</label>
                <textarea
                  value={testCase.input}
                  onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                  className="w-full p-2 bg-gray-800 rounded text-sm border border-gray-600"
                  rows={2}
                  placeholder="Test input (leave empty if none)"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-1">Expected Output: <span className="text-red-400">*</span></label>
                <textarea
                  value={testCase.expected_output}
                  onChange={(e) => updateTestCase(index, 'expected_output', e.target.value)}
                  className="w-full p-2 bg-gray-800 rounded text-sm border border-gray-600"
                  rows={2}
                  placeholder="Expected output (required)"
                />
              </div>
            </div>
            
            <input
              type="text"
              value={testCase.description}
              onChange={(e) => updateTestCase(index, 'description', e.target.value)}
              className="w-full p-2 bg-gray-800 rounded text-sm border border-gray-600"
              placeholder="Test case description"
            />
          </div>
        ))}

        {/* Test Case Summary */}
        <div className="bg-blue-900 p-3 rounded border border-blue-600">
          <div className="flex justify-between text-sm">
            <span>Total Test Cases: {draft.test_cases.length}</span>
            <span>Total Points: {draft.test_cases.reduce((sum, tc) => sum + tc.points, 0)}/{draft.total_points}</span>
            <span>Public: {draft.test_cases.filter(tc => tc.is_public).length}</span>
          </div>
        </div>
      </div>

      {/* Upload Button */}
      <div className="flex space-x-4">
        <button
          onClick={uploadQuestion}
          className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded flex items-center space-x-2"
        >
          <Upload className="h-4 w-4" />
          <span>📤 Upload Enhanced Question</span>
        </button>
        <button
          onClick={() => setShowUploader(false)}
          className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  )

  /* ---------- Enhanced Participant Display ---------- */
  const EnhancedParticipantsList = () => (
    <div className="space-y-3">
      {participants.map((participant, index) => (
        <div key={index} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium">{participant.name}</h4>
              <div className="text-sm text-gray-400 space-x-4">
                <span>Joined: {new Date(participant.joined_at).toLocaleTimeString()}</span>
                {participant.completed && participant.submitted_at && (
                  <span>Submitted: {new Date(participant.submitted_at).toLocaleTimeString()}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              {participant.completed ? (
                <div>
                  <div className="text-lg font-bold text-green-400">{participant.score}%</div>
                  <div className="text-sm text-gray-400">
                    {participant.passed_tests || 0}/{participant.total_tests || 1} tests
                  </div>
                  {participant.points_earned && participant.total_points && (
                    <div className="text-xs text-blue-400">
                      {participant.points_earned}/{participant.total_points} pts
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-yellow-400">Working...</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  // Rest of your existing component logic (exam lifecycle, UI, etc.)
  const startExam = async () => {
    if (!confirm('Start the exam now?')) return
    try {
      const res = await fetch('http://127.0.0.1:5000/api/exam/start-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_code: examCode })
      })
      const data = await res.json()
      data.success ? fetchExamInfo() : alert(`❌ ${data.error}`)
    } catch { 
      alert('❌ Network error') 
    }
  }

  const stopExam = async () => {
    if (!confirm('Stop the exam immediately?')) return
    try {
      const res = await fetch('http://127.0.0.1:5000/api/exam/stop-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_code: examCode })
      })
      const data = await res.json()
      data.success ? fetchExamInfo() : alert(`❌ ${data.error}`)
    } catch { 
      alert('❌ Network error') 
    }
  }

  /* ===========================  RENDER  =========================== */
  if (loading) return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <RefreshCw className="h-8 w-8 animate-spin mb-4"/>
        <p>Loading enhanced host panel …</p>
      </div>
    </div>
  )

  if (error || !examInfo) return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mb-4"/>
        <p className="mb-2">{error || 'Unknown error'}</p>
        <button
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          onClick={fetchExamInfo}
        >Retry</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Enhanced Header + Tabs */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="font-bold text-2xl flex items-center space-x-2">
              <TestTube className="h-6 w-6 text-green-400" />
              <span>Enhanced Host Panel</span>
            </h1>
            <p className="text-sm text-gray-400">
              Exam Code: {examCode} • Dynamic Scoring Enabled
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            examInfo.status === 'waiting' ? 'bg-yellow-600' :
            examInfo.status === 'active' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {examInfo.status.toUpperCase()}
          </span>
        </div>

        {/* Enhanced Tabs */}
        <div className="flex space-x-1">
          {[
            { id: 'overview', label: 'Overview', icon: Trophy },
            { id: 'participants', label: 'Participants', icon: Users },
            { id: 'questions', label: 'Questions', icon: TestTube }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded flex items-center space-x-2 ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Show Enhanced Question Uploader */}
        {showUploader && <EnhancedQuestionUploadForm />}

        {/* Overview Tab */}
        {activeTab === 'overview' && !showUploader && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enhanced Stats */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                <span>Enhanced Exam Stats</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 p-3 rounded">
                  <div className="text-2xl font-bold text-blue-400">{participants.length}</div>
                  <div className="text-sm text-gray-400">Total Participants</div>
                </div>
                <div className="bg-gray-900 p-3 rounded">
                  <div className="text-2xl font-bold text-green-400">
                    {participants.filter(p => p.completed).length}
                  </div>
                  <div className="text-sm text-gray-400">Completed</div>
                </div>
                <div className="bg-gray-900 p-3 rounded">
                  <div className="text-2xl font-bold text-purple-400">
                    {Math.round(
                      participants.filter(p => p.completed).reduce((sum, p) => sum + p.score, 0) / 
                      Math.max(participants.filter(p => p.completed).length, 1)
                    )}%
                  </div>
                  <div className="text-sm text-gray-400">Avg Score</div>
                </div>
                <div className="bg-gray-900 p-3 rounded">
                  <div className="text-2xl font-bold text-orange-400">{examInfo.duration_minutes}m</div>
                  <div className="text-sm text-gray-400">Duration</div>
                </div>
              </div>
            </div>

            {/* Enhanced Controls */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Enhanced Controls</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowUploader(true)}
                  disabled={examInfo.status !== 'waiting'}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 p-3 rounded flex items-center justify-center space-x-2"
                >
                  <TestTube className="h-4 w-4" />
                  <span>📝 Create Dynamic Question</span>
                </button>

                {examInfo.status === 'waiting' && (
                  <>
                    <button
                      onClick={startExam}
                      className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded flex items-center justify-center space-x-2"
                    >
                      <Play className="h-4 w-4" />
                      <span>🚀 Start Exam</span>
                    </button>
                    <button
                      onClick={() => setShowDurationEdit(!showDurationEdit)}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 p-3 rounded flex items-center justify-center space-x-2"
                    >
                      <Timer className="h-4 w-4" />
                      <span>⏰ Edit Duration</span>
                    </button>
                  </>
                )}

                {examInfo.status === 'active' && (
                  <button
                    onClick={stopExam}
                    className="w-full bg-red-600 hover:bg-red-700 p-3 rounded flex items-center justify-center space-x-2"
                  >
                    <Square className="h-4 w-4" />
                    <span>🛑 Stop Exam</span>
                  </button>
                )}

                {showDurationEdit && (
                  <div className="bg-gray-900 p-3 rounded">
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        value={customDuration}
                        onChange={(e) => setCustomDuration(parseInt(e.target.value) || 30)}
                        className="flex-1 p-2 bg-gray-700 rounded border border-gray-600"
                        min="5"
                        max="180"
                      />
                      <button
                        onClick={updateDuration}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Participants Tab */}
        {activeTab === 'participants' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-400" />
                <span>Enhanced Participants ({participants.length})</span>
              </h3>
              <button
                onClick={fetchParticipants}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <EnhancedParticipantsList />
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold flex items-center space-x-2">
                <TestTube className="h-5 w-5 text-green-400" />
                <span>Dynamic Scoring Questions</span>
              </h3>
              <button
                onClick={() => setShowUploader(true)}
                disabled={examInfo.status !== 'waiting'}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Question</span>
              </button>
            </div>
            
            {examInfo.problem_title ? (
              <div className="bg-gray-900 p-4 rounded border border-green-600">
                <h4 className="font-medium text-green-400 mb-2">
                  📝 {examInfo.problem_title}
                </h4>
                <p className="text-gray-300 text-sm mb-3">
                  {examInfo.problem_description || 'No description available'}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span>✅ Dynamic scoring enabled</span>
                  <span>🧪 Test case based</span>
                  <span>🎯 Point distributed</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No questions uploaded yet</p>
                <p className="text-sm">Create a question with dynamic scoring to get started</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
