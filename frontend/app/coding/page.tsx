'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Lock, Shield, AlertTriangle, Users, Trophy, Clock, Code, Zap, Sparkles, Star, Brain, CheckCircle, XCircle } from 'lucide-react'

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

  // ✅ UPDATED CREATE EXAM WITH HOST PANEL REDIRECT
  const createExam = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/exam/create-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'String Capitalizer Challenge',
          problem_id: 'string-capitalizer',
          duration_minutes: 30,
          host_name: participantName,
          max_participants: 50
        })
      })
      
      const data = await response.json()
      console.log('📦 Create exam response:', data)
      
      if (data.success) {
        // ✅ CORRECTED: Use exam_code, NOT exam_id
        const participantCode = data.exam_code  // This is the 6-character code
        const databaseId = data.exam_id         // This is the MongoDB ObjectId
        
        setExamId(participantCode)
        setExamInfo({ title: 'String Capitalizer Challenge', status: 'waiting' })
        
        // Store host exam data
        localStorage.setItem('host_exam', JSON.stringify({
          exam_code: participantCode,
          exam_id: databaseId,
          host_name: participantName,
          created_at: new Date().toISOString(),
          exam_details: data.exam_details || {}
        }))
        
        alert(`✅ Exam Created Successfully!

📝 Exam Code: ${participantCode}
📋 Title: String Capitalizer Challenge
👤 Host: ${participantName}
⏱️ Duration: 30 minutes

🔗 Share this code with participants: ${participantCode}

Redirecting to Host Management Panel...`)

        // ✅ REDIRECT TO HOST PANEL
        setTimeout(() => {
          router.push(`/coding/host/${participantCode}`)
        }, 2000)
        
      } else {
        alert(`❌ Failed to create exam: ${data.error}`)
      }
    } catch (error) {
      console.error('Create exam error:', error)
      alert('❌ Failed to create exam - network error')
    }
  }

  // ✅ CORRECTED JOIN FUNCTION WITH PROPER REDIRECT
  const joinExam = async () => {
    try {
      console.log('🚀 Joining with:', { exam_code: examId, student_name: participantName })
      
      const response = await fetch('http://127.0.0.1:5000/api/exam/join-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_code: examId,           // ✅ Correct field name
          student_name: participantName // ✅ Changed from 'name' to 'student_name'
        })
      })
      
      const data = await response.json()
      console.log('📦 Join response:', data)
      
      if (data.success) {
        setExamInfo(data.exam_info)
        
        // Store exam session data for the exam interface
        localStorage.setItem('exam_session', JSON.stringify({
          exam_code: examId,
          student_name: participantName,
          exam_info: data.exam_info,
          joined_at: new Date().toISOString()
        }))
        
        alert(`✅ Successfully joined: ${data.exam_info.title}!

👤 Joined as: ${participantName}
📊 Participants: ${data.exam_info.participants_count}/${data.exam_info.max_participants}
⏱️ Duration: ${data.exam_info.duration_minutes} minutes

Redirecting to exam interface...`)

        // ✅ REDIRECT TO EXAM INTERFACE
        setTimeout(() => {
          router.push('/coding/exam')
        }, 1500)
        
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Join error:', error)
      alert('❌ Failed to join exam - network error')
    }
  }

  const startExam = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/exam/start-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_code: examId })
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
    setIsExecuting(true)
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
    } finally {
      setIsExecuting(false)
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

  // Role Selection Screen with Enhanced Animations
  if (userRole === 'selector') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center relative overflow-hidden animate-fade-in">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white rounded-full animate-float"></div>
          <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-white rounded-full animate-float animate-delay-500"></div>
          <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-white rounded-full animate-float animate-delay-1000"></div>
          
          {/* Floating particles */}
          <div className="absolute top-1/6 left-1/6 w-2 h-2 bg-white rounded-full animate-pulse opacity-60"></div>
          <div className="absolute top-2/3 left-3/4 w-1 h-1 bg-white rounded-full animate-pulse animate-delay-300 opacity-40"></div>
          <div className="absolute top-1/3 right-1/2 w-1.5 h-1.5 bg-white rounded-full animate-pulse animate-delay-700 opacity-50"></div>
        </div>

        {/* Floating sparkles */}
        <div className="absolute top-1/4 right-1/3 animate-float animate-delay-200">
          <Sparkles className="w-6 h-6 text-white opacity-60 animate-pulse" />
        </div>
        <div className="absolute bottom-1/4 left-1/4 animate-float animate-delay-800">
          <Star className="w-4 h-4 text-white opacity-50 animate-spin-slow" />
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-10 max-w-lg w-full transform animate-scale-in hover:scale-105 transition-all duration-500 relative overflow-hidden group">
          {/* Card shine effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000"></div>
          
          <div className="relative z-10">
            <div className="text-center mb-10">
              <div className="flex justify-center mb-4 animate-bounce">
                <Code className="h-16 w-16 text-blue-600 animate-pulse" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-3 animate-slide-down">
                OpenLearnX Coding Exam
              </h1>
              <p className="text-gray-600 animate-fade-in animate-delay-300">
                Choose your role to get started
              </p>
            </div>
            
            <div className="space-y-6">
              <button
                onClick={() => setUserRole('host')}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 px-6 rounded-xl flex items-center justify-center space-x-3 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 animate-slide-up group relative overflow-hidden"
                style={{ animationDelay: '0.1s' }}
              >
                {/* Button background animation */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10 flex items-center space-x-3">
                  <Users className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                  <span className="text-lg font-semibold group-hover:tracking-wider transition-all duration-300">Host an Exam</span>
                </div>
                
                {/* Floating particles on hover */}
                <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-300">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              </button>
              
              <button
                onClick={() => setUserRole('participant')}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-4 px-6 rounded-xl flex items-center justify-center space-x-3 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 animate-slide-up group relative overflow-hidden"
                style={{ animationDelay: '0.2s' }}
              >
                {/* Button background animation */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10 flex items-center space-x-3">
                  <Play className="h-6 w-6 transition-transform duration-300 group-hover:translate-x-1 group-hover:scale-110" />
                  <span className="text-lg font-semibold group-hover:tracking-wider transition-all duration-300">Join an Exam</span>
                </div>
                
                {/* Floating particles on hover */}
                <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-300">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              </button>
            </div>

            {/* Animated footer */}
            <div className="mt-8 text-center animate-fade-in animate-delay-500">
              <p className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-300">
                Secure • Real-time • Professional
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Host Setup Screen with Enhanced UI
  if (userRole === 'host' && !examId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center relative overflow-hidden animate-fade-in">
        {/* Enhanced background animations */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-overlay animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-white rounded-full mix-blend-overlay animate-blob animation-delay-4000"></div>
        </div>

        {/* Floating icons */}
        <div className="absolute top-1/5 right-1/5 animate-float animate-delay-1000">
          <Brain className="w-8 h-8 text-white opacity-30 animate-pulse" />
        </div>
        <div className="absolute bottom-1/5 left-1/5 animate-float animate-delay-2000">
          <Zap className="w-6 h-6 text-white opacity-20 animate-bounce" />
        </div>

        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-12 max-w-xl w-full transform animate-scale-in hover:scale-105 transition-all duration-500 relative overflow-hidden group">
          {/* Enhanced shine effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-blue-200/30 to-transparent transition-transform duration-1000"></div>
          
          <div className="relative z-10">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6 relative">
                <div className="p-4 bg-blue-100 rounded-full animate-bounce">
                  <Users className="h-12 w-12 text-blue-600 animate-pulse" />
                </div>
                {/* Floating particles around icon */}
                <div className="absolute -top-2 -right-2 w-3 h-3 bg-blue-400 rounded-full animate-ping"></div>
                <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-blue-300 rounded-full animate-ping animation-delay-500"></div>
              </div>
              <h1 className="text-4xl font-bold text-gray-800 mb-4 animate-slide-down">
                Host Coding Exam
              </h1>
              <p className="text-gray-600 text-lg animate-fade-in animate-delay-300">
                Create a secure coding environment for your participants
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="relative animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl text-lg transition-all duration-300 focus:ring-4 focus:ring-blue-200 focus:border-blue-500 hover:border-blue-300 bg-gray-50 hover:bg-white focus:bg-white group"
                />
                {/* Input decoration */}
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300">
                  <CheckCircle className="w-5 h-5 text-green-500 animate-pulse" />
                </div>
              </div>
              
              <button
                onClick={createExam}
                disabled={!participantName}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 px-6 rounded-xl text-lg font-semibold transform transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 disabled:hover:scale-100 animate-slide-up group relative overflow-hidden"
                style={{ animationDelay: '0.2s' }}
              >
                {/* Button animation background */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10 flex items-center justify-center space-x-3">
                  <span className="group-hover:tracking-wider transition-all duration-300">Create Exam</span>
                  <Sparkles className="w-5 h-5 group-hover:animate-spin transition-transform duration-300" />
                </div>
                
                {/* Ripple effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 group-hover:animate-ping transition-all duration-300 bg-white rounded-xl"></div>
              </button>
            </div>
            
            {/* Enhanced Debug Info */}
            <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl text-sm text-gray-600 animate-fade-in border border-gray-200 hover:border-blue-300 transition-colors duration-300" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-semibold">System Status</span>
              </div>
              <div className="space-y-2">
                <p className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Will create with host_name: "{participantName}"</span>
                </p>
                <p className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Will display exam_code (6 chars), not exam_id</span>
                </p>
                <p className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-blue-500 animate-pulse" />
                  <span>After creation → redirect to /coding/host/[examCode]</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Join Exam Screen with Enhanced Animations
  if (userRole === 'participant' && !examInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-blue-900 flex items-center justify-center relative overflow-hidden animate-fade-in">
        {/* Enhanced background effects */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-white rounded-full animate-float hover:scale-150 transition-transform duration-500"></div>
          <div className="absolute top-3/4 right-1/4 w-32 h-32 bg-white rounded-full animate-float animate-delay-500 hover:scale-125 transition-transform duration-500"></div>
          <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-white rounded-full animate-float animate-delay-1000 hover:scale-200 transition-transform duration-500"></div>
        </div>

        {/* Animated particles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/6 left-1/6 w-3 h-3 bg-white rounded-full animate-pulse opacity-60 shadow-lg"></div>
          <div className="absolute top-2/3 left-3/4 w-2 h-2 bg-white rounded-full animate-pulse animate-delay-300 opacity-40"></div>
          <div className="absolute top-1/2 left-1/5 w-2.5 h-2.5 bg-white rounded-full animate-pulse animate-delay-700 opacity-50"></div>
        </div>

        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-12 max-w-xl w-full transform animate-scale-in hover:scale-105 transition-all duration-500 relative overflow-hidden group">
          {/* Enhanced card effects */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-green-200/30 to-transparent transition-transform duration-1000"></div>
          
          <div className="relative z-10">
            <div className="text-center mb-10">
              <div className="flex justify-center mb-6 relative">
                <div className="p-4 bg-green-100 rounded-full animate-bounce">
                  <Play className="h-12 w-12 text-green-600 animate-pulse" />
                </div>
                {/* Animated ring around icon */}
                <div className="absolute inset-0 border-4 border-green-300 rounded-full animate-ping opacity-30"></div>
                <div className="absolute inset-2 border-2 border-green-400 rounded-full animate-ping opacity-40 animation-delay-500"></div>
              </div>
              <h1 className="text-4xl font-bold text-gray-800 mb-4 animate-slide-down">
                Join Coding Exam
              </h1>
              <p className="text-gray-600 text-lg animate-fade-in animate-delay-300">
                Enter the exam code to participate in the coding challenge
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="relative animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <input
                  type="text"
                  placeholder="Enter exam code (e.g., 3BPIBZ)"
                  value={examId}
                  onChange={(e) => setExamId(e.target.value.toUpperCase())}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl text-center font-mono text-2xl tracking-widest uppercase transition-all duration-300 focus:ring-4 focus:ring-green-200 focus:border-green-500 hover:border-green-300 bg-gray-50 hover:bg-white focus:bg-white relative group"
                  maxLength={6}
                />
                {/* Input decorations */}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-green-400 to-blue-400 transform scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300 rounded-full"></div>
                {examId.length === 6 && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 animate-bounce">
                    <CheckCircle className="w-6 h-6 text-green-500 animate-pulse" />
                  </div>
                )}
              </div>
              
              <div className="relative animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl text-lg transition-all duration-300 focus:ring-4 focus:ring-green-200 focus:border-green-500 hover:border-green-300 bg-gray-50 hover:bg-white focus:bg-white group"
                />
                {/* Name validation indicator */}
                {participantName.length > 2 && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 animate-bounce">
                    <CheckCircle className="w-5 h-5 text-green-500 animate-pulse" />
                  </div>
                )}
              </div>
              
              <button
                onClick={joinExam}
                disabled={!examId || !participantName}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 px-6 rounded-xl text-lg font-semibold transform transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 disabled:hover:scale-100 animate-slide-up group relative overflow-hidden"
                style={{ animationDelay: '0.3s' }}
              >
                {/* Enhanced button animations */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10 flex items-center justify-center space-x-3">
                  <span className="group-hover:tracking-wider transition-all duration-300">Join Exam</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-white rounded-full animate-bounce animation-delay-200"></div>
                    <div className="w-1 h-1 bg-white rounded-full animate-bounce animation-delay-400"></div>
                  </div>
                </div>
                
                {/* Button ripple effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 group-hover:animate-ping transition-all duration-300 bg-white rounded-xl"></div>
              </button>
              
              {/* Enhanced Debug Info */}
              <div className="text-sm text-gray-500 p-6 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl animate-fade-in border border-gray-200 hover:border-green-300 transition-colors duration-300" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="font-semibold">Connection Status</span>
                </div>
                <div className="space-y-2">
                  <p className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Will send: exam_code="{examId}" student_name="{participantName}"</span>
                  </p>
                  <p className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-blue-500 animate-pulse" />
                    <span>After join → redirect to /coding/exam</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Enhanced System Requirements Check
  if (!systemChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-black text-white flex items-center justify-center relative overflow-hidden animate-fade-in">
        {/* Animated warning elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-red-500 rounded-full animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-yellow-500 rounded-full animate-pulse animate-delay-500"></div>
          <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-orange-500 rounded-full animate-pulse animate-delay-1000"></div>
        </div>

        {/* Floating warning icons */}
        <div className="absolute top-1/5 right-1/5 animate-float animate-delay-1000">
          <AlertTriangle className="w-8 h-8 text-red-400 opacity-60 animate-pulse" />
        </div>
        <div className="absolute bottom-1/5 left-1/5 animate-float animate-delay-2000">
          <Shield className="w-6 h-6 text-yellow-400 opacity-40 animate-bounce" />
        </div>

        <div className="bg-gray-800/95 backdrop-blur-lg rounded-3xl p-12 max-w-2xl w-full transform animate-scale-in hover:scale-105 transition-all duration-500 border border-red-500/30 relative overflow-hidden group">
          {/* Security-themed background */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 to-yellow-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative z-10">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6 relative">
                <div className="p-4 bg-red-900/50 rounded-full animate-pulse">
                  <Shield className="h-16 w-16 text-red-400 animate-bounce" />
                </div>
                {/* Security rings */}
                <div className="absolute inset-0 border-2 border-red-500 rounded-full animate-ping opacity-30"></div>
                <div className="absolute inset-2 border border-yellow-500 rounded-full animate-ping opacity-40 animation-delay-500"></div>
              </div>
              <h1 className="text-4xl font-bold mb-6 animate-slide-down">
                System Requirements Check
              </h1>
              <p className="text-xl text-gray-300 animate-fade-in animate-delay-300">
                Preparing secure exam environment
              </p>
            </div>
            
            <div className="space-y-6 mb-10">
              <div className="flex items-center space-x-4 p-4 bg-gray-700/50 rounded-xl animate-slide-up hover:bg-gray-600/50 transition-colors duration-300" style={{ animationDelay: '0.1s' }}>
                <Shield className="h-8 w-8 text-green-400 animate-pulse" />
                <div className="flex-1">
                  <span className="text-lg font-medium">Fullscreen mode support</span>
                  <p className="text-sm text-gray-400">Required for secure examination</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-400 animate-bounce" />
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-gray-700/50 rounded-xl animate-slide-up hover:bg-gray-600/50 transition-colors duration-300" style={{ animationDelay: '0.2s' }}>
                <Lock className="h-8 w-8 text-yellow-400 animate-bounce" />
                <div className="flex-1">
                  <span className="text-lg font-medium">Copy/paste will be disabled</span>
                  <p className="text-sm text-gray-400">Prevents unauthorized assistance</p>
                </div>
                <XCircle className="h-6 w-6 text-yellow-400 animate-pulse" />
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-gray-700/50 rounded-xl animate-slide-up hover:bg-gray-600/50 transition-colors duration-300" style={{ animationDelay: '0.3s' }}>
                <AlertTriangle className="h-8 w-8 text-red-400 animate-pulse" />
                <div className="flex-1">
                  <span className="text-lg font-medium">Virtual environments will be detected</span>
                  <p className="text-sm text-gray-400">Ensures exam integrity</p>
                </div>
                <Shield className="h-6 w-6 text-red-400 animate-bounce" />
              </div>
            </div>
            
            <button
              onClick={acceptSystemRequirements}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-4 px-6 rounded-xl text-lg font-semibold transform transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 animate-slide-up group relative overflow-hidden"
              style={{ animationDelay: '0.4s' }}
            >
              {/* Button warning effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative z-10 flex items-center justify-center space-x-3">
                <Lock className="h-6 w-6 group-hover:animate-bounce transition-transform duration-300" />
                <span className="group-hover:tracking-wider transition-all duration-300">Accept & Enter Secure Mode</span>
                <Shield className="h-6 w-6 group-hover:animate-pulse transition-transform duration-300" />
              </div>
              
              {/* Warning pulse effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-20 group-hover:animate-ping transition-all duration-300 bg-white rounded-xl"></div>
            </button>

            {/* Security notice */}
            <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-xl animate-fade-in animate-delay-500">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400 animate-pulse" />
                <span className="font-semibold text-yellow-300">Security Notice</span>
              </div>
              <p className="text-sm text-yellow-200">
                This exam uses advanced security measures. Browser restrictions will be enforced during the examination period.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Enhanced Main Exam Interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white animate-fade-in relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-overlay animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-overlay animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-green-500 rounded-full mix-blend-overlay animate-blob animation-delay-4000"></div>
      </div>

      {/* Enhanced Security Status Bar */}
      <div className="bg-gradient-to-r from-red-900 via-red-800 to-red-900 text-white p-4 flex items-center justify-between animate-slide-down shadow-2xl relative overflow-hidden">
        {/* Security bar background animation */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-600/20 to-transparent animate-pulse"></div>
        
        <div className="flex items-center space-x-6 relative z-10">
          <div className="flex items-center space-x-2 px-3 py-1 bg-red-800/50 rounded-full">
            <Shield className="h-5 w-5 animate-pulse" />
            <span className="text-sm font-bold tracking-wider">SECURE MODE ACTIVE</span>
          </div>
          
          <div className="flex items-center space-x-2 px-3 py-1 bg-red-700/50 rounded-full">
            <Lock className="h-5 w-5 animate-bounce" />
            <span className="text-sm font-medium">Copy/Paste Disabled</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1 bg-red-600/50 rounded-full">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
            <span className="text-sm font-medium">VM Detection Active</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-6 relative z-10">
          {timeRemaining > 0 && (
            <div className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-red-700 to-red-600 rounded-full shadow-lg">
              <Clock className="h-5 w-5 animate-pulse" />
              <span className="font-mono text-lg font-bold tracking-wider">{formatTime(timeRemaining)}</span>
              {timeRemaining < 300 && ( // Last 5 minutes warning
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
              )}
            </div>
          )}
          
          <div className="px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-600 rounded-full shadow-lg">
            <span className="font-mono tracking-widest text-lg font-bold">Exam: {examId}</span>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Enhanced Main Coding Area */}
        <div className="flex-1 p-8 animate-slide-right relative">
          {/* Problem Description with Enhanced Styling */}
          <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-700 rounded-2xl p-8 mb-8 transform transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:scale-105 relative overflow-hidden group">
            {/* Card background animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-blue-600/20 rounded-xl animate-pulse">
                  <Code className="h-8 w-8 text-blue-400" />
                </div>
                <h2 className="text-3xl font-bold animate-slide-up">Problem: String Capitalizer</h2>
                <div className="flex-1 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
              </div>
              
              <p className="mb-6 text-lg text-gray-300 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                Write a function that converts a string to uppercase.
              </p>
              
              <div className="bg-black/50 p-6 rounded-xl transform transition-all duration-300 hover:bg-black/60 animate-slide-up border border-gray-600 hover:border-blue-500/50" style={{ animationDelay: '0.2s' }}>
                <pre className="text-green-400 font-mono text-lg">
{`def capitalize_string(text):
    # Your code here
    pass

# Test: capitalize_string("hello") should return "HELLO"`}
                </pre>
              </div>
            </div>
            
            {/* Hover shine effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-1000"></div>
          </div>

          {/* Enhanced Code Editor */}
          <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-700 rounded-2xl p-8 transform transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 relative overflow-hidden group">
            {/* Editor background animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-green-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-600/20 rounded-xl animate-pulse">
                    <Zap className="h-8 w-8 text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-bold animate-slide-up">Code Editor</h3>
                </div>
                
                {/* Editor status indicators */}
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 px-3 py-1 bg-green-900/30 rounded-full">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-300">Ready</span>
                  </div>
                  <div className="text-sm text-gray-400 font-mono">
                    Lines: {code.split('\n').length} | Chars: {code.length}
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="def capitalize_string(text):\n    # Your code here\n    pass"
                  className="w-full h-80 bg-black/70 text-green-400 font-mono p-6 rounded-xl border-2 border-gray-600 resize-none transition-all duration-300 focus:border-green-500 focus:ring-4 focus:ring-green-500/20 hover:border-gray-500 animate-slide-up backdrop-blur-sm"
                  style={{ 
                    userSelect: 'none', 
                    WebkitUserSelect: 'none', 
                    animationDelay: '0.1s',
                    lineHeight: '1.6',
                    fontSize: '16px'
                  }}
                />
                
                {/* Editor enhancements */}
                <div className="absolute top-4 right-4 flex space-x-2">
                  {code.length > 0 && (
                    <div className="px-2 py-1 bg-blue-900/50 rounded text-xs text-blue-300 animate-fade-in">
                      Modified
                    </div>
                  )}
                </div>
                
                {/* Line numbers overlay */}
                <div className="absolute left-2 top-6 text-gray-500 font-mono text-sm select-none pointer-events-none">
                  {Array.from({ length: code.split('\n').length }, (_, i) => (
                    <div key={i} className="h-6 leading-6">
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-6">
                <div className="flex space-x-4">
                  <button
                    onClick={submitSolution}
                    disabled={isExecuting}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 px-8 py-3 rounded-xl flex items-center space-x-3 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 animate-slide-up group relative overflow-hidden"
                    style={{ animationDelay: '0.2s' }}
                  >
                    {/* Button background animation */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="relative z-10 flex items-center space-x-3">
                      {isExecuting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Play className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                      )}
                      <span className="text-lg font-semibold">
                        {isExecuting ? 'Submitting...' : 'Submit Solution'}
                      </span>
                    </div>
                    
                    {/* Sparkle effect */}
                    <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-300">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  </button>
                  
                  {userRole === 'host' && examInfo?.status === 'waiting' && (
                    <button
                      onClick={startExam}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8 py-3 rounded-xl text-lg font-semibold transform transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 animate-slide-up group relative overflow-hidden"
                      style={{ animationDelay: '0.3s' }}
                    >
                      {/* Button animation */}
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      <div className="relative z-10 flex items-center space-x-2">
                        <span>Start Exam</span>
                        <Zap className="h-5 w-5 group-hover:animate-bounce" />
                      </div>
                    </button>
                  )}
                </div>
                
                {/* Code statistics */}
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span>Python 3.9</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Syntax OK</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Editor shine effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-1000"></div>
          </div>
        </div>

        {/* Enhanced Leaderboard Sidebar */}
        <div className="w-96 bg-gradient-to-b from-gray-800 via-gray-800 to-gray-700 p-8 animate-slide-left relative overflow-hidden">
          {/* Sidebar background animation */}
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-900/10 to-orange-900/10 opacity-50"></div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-8 animate-slide-down">
              <div className="p-3 bg-yellow-600/20 rounded-xl animate-bounce">
                <Trophy className="h-8 w-8 text-yellow-400 animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold">Leaderboard</h3>
              <div className="flex-1 h-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full animate-pulse"></div>
            </div>
            
            {/* Leaderboard stats */}
            <div className="mb-6 p-4 bg-black/30 rounded-xl border border-gray-600">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Total Participants</span>
                <span className="font-bold text-blue-400">{leaderboard.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Completed</span>
                <span className="font-bold text-green-400">
                  {leaderboard.filter(p => p.completed).length}
                </span>
              </div>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {leaderboard.length > 0 ? leaderboard.map((participant, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-xl transform transition-all duration-300 hover:scale-105 hover:shadow-lg animate-slide-up relative overflow-hidden group cursor-pointer ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border border-yellow-500/30' : 
                    index === 1 ? 'bg-gradient-to-r from-gray-700/50 to-gray-600/50 border border-gray-400/30' : 
                    index === 2 ? 'bg-gradient-to-r from-orange-900/50 to-red-900/50 border border-orange-500/30' : 
                    'bg-gradient-to-r from-gray-700/50 to-gray-600/50 border border-gray-500/30'
                  }`}
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  {/* Rank indicator */}
                  <div className="absolute top-2 left-2">
                    {index < 3 ? (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        'bg-orange-500 text-white'
                      }`}>
                        {index + 1}
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white">
                        {index + 1}
                      </div>
                    )}
                  </div>
                  
                  {/* Participant info */}
                  <div className="ml-8">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-lg group-hover:text-white transition-colors duration-300">
                        {participant.name}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xl animate-pulse">
                          {participant.score}%
                        </span>
                        {participant.completed && (
                          <CheckCircle className="w-5 h-5 text-green-400 animate-bounce" />
                        )}
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-1000 ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-400' :
                          index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400' :
                          index === 2 ? 'bg-gradient-to-r from-orange-400 to-red-400' :
                          'bg-gradient-to-r from-blue-400 to-purple-400'
                        }`}
                        style={{ width: `${participant.score}%` }}
                      ></div>
                    </div>
                    
                    {/* Submission time */}
                    {participant.submitted_at && (
                      <div className="text-xs text-gray-400">
                        Submitted: {new Date(participant.submitted_at).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  
                  {/* Hover effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700"></div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-400 animate-pulse">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No participants yet</p>
                </div>
              )}
            </div>
            
            <button
              onClick={fetchLeaderboard}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 py-3 rounded-xl text-lg font-semibold transform transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 animate-slide-up group relative overflow-hidden"
              style={{ animationDelay: '0.4s' }}
            >
              {/* Button background animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative z-10 flex items-center justify-center space-x-2">
                <span className="group-hover:tracking-wider transition-all duration-300">Refresh Leaderboard</span>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce group-hover:animate-ping"></div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Floating action button for help */}
      <div className="fixed bottom-8 right-8 animate-bounce">
        <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 p-4 rounded-full shadow-2xl transform transition-all duration-300 hover:scale-110 group">
          <AlertTriangle className="h-6 w-6 text-white group-hover:animate-spin" />
        </button>
      </div>
    </div>
  )
}
