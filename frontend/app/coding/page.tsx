'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Lock, Shield, AlertTriangle, Users, Trophy, Clock } from 'lucide-react'

type UserRole = 'selector' | 'host' | 'participant'
type ExamStatus = 'waiting' | 'active' | 'completed'

interface Participant {
  name: string
  score: number
  completed: boolean
  submitted_at?: string
}

export default function CodingExamPlatform() {
  const [userRole, setUserRole] = useState<UserRole>('selector')
  const [examId, setExamId] = useState('')
  const [participantName, setParticipantName] = useState('')
  const [examInfo, setExamInfo] = useState<any>(null)
  const [systemChecked, setSystemChecked] = useState(false)
  const [isSecureMode, setIsSecureMode] = useState(false)
  const [leaderboard, setLeaderboard] = useState<Participant[]>([])
  const [timeRemaining, setTimeRemaining] = useState(0)
  
  // Coding states
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)

  const router = useRouter()

  // System Requirements Check
  const checkSystemRequirements = () => {
    const checks = {
      fullscreenSupported: document.fullscreenEnabled,
      webGLSupported: !!document.createElement('canvas').getContext('webgl'),
      localStorageSupported: typeof Storage !== 'undefined',
      cookiesEnabled: navigator.cookieEnabled
    }
    
    const allPassed = Object.values(checks).every(check => check)
    
    if (allPassed) {
      setSystemChecked(true)
      alert('System requirements check passed! ✅')
    } else {
      alert('System requirements not met. Please use a modern browser.')
    }
    
    return allPassed
  }

  const acceptSystemRequirements = () => {
    if (checkSystemRequirements()) {
      enableSecureMode()
    }
  }

  const enableSecureMode = () => {
    // Enter fullscreen
    document.documentElement.requestFullscreen().then(() => {
      setIsSecureMode(true)
      disableBrowserFeatures()
      detectVirtualEnvironment()
      
      // Start exam timer if in active exam
      if (examInfo?.status === 'active') {
        startExamTimer()
      }
    }).catch(() => {
      alert('Fullscreen mode is required for secure coding')
    })
  }

  const disableBrowserFeatures = () => {
    // Disable right-click, copy/paste, dev tools
    const blockActions = (e: KeyboardEvent) => {
      if (e.ctrlKey && ['c', 'v', 'x', 'a'].includes(e.key)) {
        e.preventDefault()
        alert('Copy/paste is disabled in exam mode')
      }
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'C'].includes(e.key))) {
        e.preventDefault()
        alert('Developer tools are disabled')
      }
    }
    
    document.addEventListener('keydown', blockActions)
    document.addEventListener('contextmenu', e => e.preventDefault())
    document.addEventListener('selectstart', e => e.preventDefault())
  }

  const detectVirtualEnvironment = () => {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')
    
    if (gl) {
      const renderer = gl.getParameter(gl.RENDERER)
      if (renderer.includes('VMware') || renderer.includes('VirtualBox')) {
        alert('Virtual environment detected. Exam will be terminated.')
        window.location.href = '/'
      }
    }
  }

  const createExam = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/exam/create-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'String Capitalizer Challenge',
          problem_id: 'string-capitalizer',
          duration_minutes: 30,
          host_name: participantName
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setExamId(data.exam_code)
        setExamInfo({ title: 'String Capitalizer Challenge', status: 'waiting' })
        alert(`Exam created! Share this code with participants: ${data.exam_code}`)
      }
    } catch (error) {
      alert('Failed to create exam')
    }
  }

  const joinExam = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/exam/join-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: examId,
          name: participantName
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setExamInfo(data.exam_info)
        alert('Successfully joined the exam!')
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('Failed to join exam')
    }
  }

  const startExam = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/exam/start-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_id: examId })
      })
      
      const data = await response.json()
      if (data.success) {
        setExamInfo(prev => ({ ...prev, status: 'active' }))
        alert('Exam started! Participants can now begin coding.')
        startExamTimer()
      }
    } catch (error) {
      alert('Failed to start exam')
    }
  }

  const startExamTimer = () => {
    const duration = 30 * 60 // 30 minutes in seconds
    setTimeRemaining(duration)
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          alert('Time is up!')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const submitSolution = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/exam/submit-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      
      const data = await response.json()
      if (data.success) {
        alert(`Solution submitted! Your score: ${data.score}%`)
        fetchLeaderboard()
      }
    } catch (error) {
      alert('Failed to submit solution')
    }
  }

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/exam/leaderboard/${examId}`)
      const data = await response.json()
      setLeaderboard(data.leaderboard)
    } catch (error) {
      console.error('Failed to fetch leaderboard')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Role Selection Screen
  if (userRole === 'selector') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-8">OpenLearnX Coding Exam</h1>
          
          <div className="space-y-4">
            <button
              onClick={() => setUserRole('host')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg flex items-center justify-center space-x-2"
            >
              <Users className="h-5 w-5" />
              <span>Host an Exam</span>
            </button>
            
            <button
              onClick={() => setUserRole('participant')}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg flex items-center justify-center space-x-2"
            >
              <Play className="h-5 w-5" />
              <span>Join an Exam</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Host Setup Screen
  if (userRole === 'host' && !examId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-8">Host Coding Exam</h1>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter your name"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
            />
            
            <button
              onClick={createExam}
              disabled={!participantName}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg"
            >
              Create Exam
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Join Exam Screen
  if (userRole === 'participant' && !examInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 to-blue-900 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-8">Join Coding Exam</h1>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter exam code"
              value={examId}
              onChange={(e) => setExamId(e.target.value.toUpperCase())}
              className="w-full p-3 border border-gray-300 rounded-lg"
            />
            
            <input
              type="text"
              placeholder="Enter your name"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
            />
            
            <button
              onClick={joinExam}
              disabled={!examId || !participantName}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg"
            >
              Join Exam
            </button>
          </div>
        </div>
      </div>
    )
  }

  // System Requirements Check
  if (!systemChecked) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-8 max-w-lg w-full">
          <h1 className="text-2xl font-bold mb-6">System Requirements Check</h1>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-400" />
              <span>Fullscreen mode support</span>
            </div>
            <div className="flex items-center space-x-2">
              <Lock className="h-5 w-5 text-yellow-400" />
              <span>Copy/paste will be disabled</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <span>Virtual environments will be detected</span>
            </div>
          </div>
          
          <button
            onClick={acceptSystemRequirements}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg"
          >
            Accept & Enter Secure Mode
          </button>
        </div>
      </div>
    )
  }

  // Main Exam Interface
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Security Status Bar */}
      <div className="bg-red-900 text-white p-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Shield className="h-4 w-4" />
          <span className="text-sm font-medium">SECURE MODE ACTIVE</span>
          <Lock className="h-4 w-4" />
          <span className="text-sm">Copy/Paste Disabled</span>
        </div>
        
        <div className="flex items-center space-x-4">
          {timeRemaining > 0 && (
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{formatTime(timeRemaining)}</span>
            </div>
          )}
          <span>Exam: {examId}</span>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Main Coding Area */}
        <div className="flex-1 p-6">
          {/* Problem Description */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Problem: String Capitalizer</h2>
            <p className="mb-4">Write a function that converts a string to uppercase.</p>
            <div className="bg-gray-900 p-4 rounded">
              <code>
{`def capitalize_string(text):
    # Your code here
    pass

# Test: capitalize_string("hello") should return "HELLO"`}
              </code>
            </div>
          </div>

          {/* Code Editor */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-4">Code Editor</h3>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="def capitalize_string(text):\n    # Your code here\n    pass"
              className="w-full h-64 bg-gray-900 text-green-400 font-mono p-4 rounded border border-gray-600 resize-none"
              style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
            />
            
            <div className="flex space-x-4 mt-4">
              <button
                onClick={submitSolution}
                className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>Submit Solution</span>
              </button>
              
              {userRole === 'host' && examInfo?.status === 'waiting' && (
                <button
                  onClick={startExam}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded"
                >
                  Start Exam
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Leaderboard Sidebar */}
        <div className="w-80 bg-gray-800 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Trophy className="h-6 w-6 text-yellow-400" />
            <h3 className="text-xl font-bold">Leaderboard</h3>
          </div>
          
          <div className="space-y-2">
            {leaderboard.map((participant, index) => (
              <div key={index} className={`p-3 rounded ${index === 0 ? 'bg-yellow-900' : index === 1 ? 'bg-gray-700' : index === 2 ? 'bg-orange-900' : 'bg-gray-700'}`}>
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    {index + 1}. {participant.name}
                  </span>
                  <span className="font-bold">{participant.score}%</span>
                </div>
              </div>
            ))}
          </div>
          
          <button
            onClick={fetchLeaderboard}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
          >
            Refresh Leaderboard
          </button>
        </div>
      </div>
    </div>
  )
}
