'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Trophy, Clock, Users, Send, RefreshCw, Play, Code, Wallet, Shield, TestTube } from 'lucide-react'

interface Participant {
  name: string
  score: number
  rank: number
  completed: boolean
  language?: string
  submission_time?: string
  wallet_address?: string
  wallet_short?: string
  blockchain_verified?: boolean
}

interface Problem {
  title: string
  description: string
  function_name: string
  languages: string[]
  examples: Array<{input: string, expected_output: string, description: string}>
  constraints: string[]
  starter_code: {[key: string]: string}
}

interface ExamSession {
  exam_code: string
  student_name: string
  wallet_address?: string
  blockchain_verified?: boolean
  exam_info: any
}

export default function EnhancedExamInterface() {
  const router = useRouter()
  const params = useParams()
  
  // ✅ FIXED: Get exam code from URL params
  const examCode = params.examCode as string
  
  const [examSession, setExamSession] = useState<ExamSession | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState('python')
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')
  const [testResults, setTestResults] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<Participant[]>([])
  const [waitingParticipants, setWaitingParticipants] = useState<Participant[]>([])
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [examStats, setExamStats] = useState<any>({})
  const [timerInitialized, setTimerInitialized] = useState(false)

  // ✅ CRITICAL FIX: Use refs to prevent infinite loops
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const refreshTimeoutRefs = useRef<NodeJS.Timeout[]>([])
  const isInitializedRef = useRef(false)

  const languageIcons: {[key: string]: string} = {
    python: '🐍',
    java: '☕',
    javascript: '🟨',
    c: '⚡',
    bash: '💻'
  }

  // ✅ FIXED: Memoized functions to prevent recreation
  const fetchProblem = useCallback(async (examCode: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/exam/get-problem/${examCode}`)
      const data = await response.json()
      
      if (data.success) {
        setProblem(data.problem)
        const defaultLang = data.problem.languages[0] || 'python'
        setSelectedLanguage(defaultLang)
        setCode(data.problem.starter_code[defaultLang] || '')
      }
    } catch (error) {
      console.error('Failed to fetch problem:', error)
    }
  }, [])

  const fetchLeaderboard = useCallback(async (examCode: string) => {
    try {
      console.log('🏆 Fetching leaderboard for:', examCode)
      
      const response = await fetch(`http://127.0.0.1:5000/api/exam/leaderboard/${examCode}?t=${Date.now()}`)
      const data = await response.json()
      
      if (data.success) {
        setLeaderboard(data.leaderboard || [])
        setWaitingParticipants(data.waiting_participants || [])
        setExamStats(data.stats || {})
        
        // Timer calculation
        if (data.exam_info && data.exam_info.status === 'active') {
          if (data.exam_info.end_time) {
            const now = Date.now()
            const endTime = new Date(data.exam_info.end_time).getTime()
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
            
            setTimeRemaining(remaining)
            if (!timerInitialized) {
              setTimerInitialized(true)
            }
          }
        }
        
        // Check user status - only once to prevent loops
        if (!hasSubmitted && examSession?.student_name) {
          const userInCompleted = data.leaderboard.find((p: Participant) => p.name === examSession.student_name)
          if (userInCompleted) {
            console.log('✅ User found in completed leaderboard')
            setHasSubmitted(true)
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch leaderboard:', error)
    }
  }, [hasSubmitted, examSession?.student_name, timerInitialized])

  // ✅ FIXED: Initialization effect - runs only once
  useEffect(() => {
    if (!examCode || isInitializedRef.current) return

    console.log('🚀 Initializing exam interface...')
    isInitializedRef.current = true

    // Initialize session
    const sessionData = localStorage.getItem('exam_session')
    if (!sessionData) {
      const newSession = {
        exam_code: examCode,
        student_name: localStorage.getItem('student_name') || 'Anonymous',
        exam_info: {}
      }
      setExamSession(newSession)
    } else {
      const session = JSON.parse(sessionData)
      if (session.exam_code !== examCode) {
        session.exam_code = examCode
      }
      setExamSession(session)
    }

    // Fetch initial data
    fetchProblem(examCode)
    fetchLeaderboard(examCode)

    return () => {
      console.log('🛑 Cleaning up initialization effect')
    }
  }, [examCode, fetchProblem, fetchLeaderboard])

  // ✅ FIXED: Separate effect for polling - controlled interval
  useEffect(() => {
    if (!examCode || !examSession) return

    console.log('📡 Starting leaderboard polling...')
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Set up polling interval - less aggressive
    intervalRef.current = setInterval(() => {
      fetchLeaderboard(examCode)
    }, 5000) // ✅ REDUCED: Changed from 2000ms to 5000ms

    return () => {
      console.log('🛑 Cleaning up polling interval')
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [examCode, examSession, fetchLeaderboard])

  // ✅ FIXED: Timer effect - separate and controlled
  useEffect(() => {
    if (!timerInitialized || timeRemaining <= 0) return

    console.log('⏱️ Starting timer...')
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = Math.max(0, prev - 1)
        if (newTime === 0) {
          alert('⏰ Time is up! Exam has ended.')
        }
        return newTime
      })
    }, 1000)

    return () => {
      console.log('🛑 Cleaning up timer')
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [timerInitialized, timeRemaining > 0]) // ✅ FIXED: Better dependency

  // ✅ FIXED: Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      console.log('🛑 Component unmounting - cleaning up all timeouts')
      refreshTimeoutRefs.current.forEach(timeout => clearTimeout(timeout))
      refreshTimeoutRefs.current = []
    }
  }, [])

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language)
    if (problem?.starter_code[language]) {
      setCode(problem.starter_code[language])
    }
    setOutput('')
    setTestResults([])
  }

  const runCode = async () => {
    if (!code.trim()) {
      alert('Please write some code first!')
      return
    }

    setIsRunning(true)
    setOutput('')
    setTestResults([])

    try {
      const response = await fetch('http://127.0.0.1:5000/api/compiler/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: selectedLanguage
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setOutput(`✅ Output:\n${result.output}`)
        if (result.execution_time) {
          setOutput(prev => prev + `\n⏱️ Execution time: ${result.execution_time}s`)
        }
      } else {
        setOutput(`❌ Error:\n${result.error}`)
      }
    } catch (error) {
      setOutput(`Execution failed: ${(error as Error).message}`)
    } finally {
      setIsRunning(false)
    }
  }

  // ✅ FIXED: Submit solution with controlled refresh
  const submitSolution = async () => {
    if (!code.trim()) {
      alert('Please write some code before submitting!')
      return
    }

    if (!examSession?.student_name) {
      alert('Student name is missing. Please refresh and try again.')
      return
    }

    if (!confirm('Submit your solution? This cannot be undone.')) return

    setIsSubmitting(true)

    try {
      console.log('📤 Submitting solution...')
      
      const submissionData = {
        exam_code: examCode,
        username: examSession.student_name,
        code: code,
        language: selectedLanguage,
        problem_id: "problem_1"
      }

      console.log('🔍 Submitting data:', submissionData)
      
      const response = await fetch('http://127.0.0.1:5000/api/exam/submit-solution', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      })

      const data = await response.json()
      console.log('📦 Submit result:', data)
      
      if (data.success) {
        setHasSubmitted(true)
        setTestResults(data.result?.test_results || [])
        
        let alertMessage = `🎉 Solution submitted successfully!\n\n`
        alertMessage += `📊 Overall Score: ${data.result?.score || 0}%\n`
        alertMessage += `✅ Tests Passed: ${data.result?.passed_tests || 0}/${data.result?.total_tests || 1}\n`
        
        if (data.result?.execution_time) {
          alertMessage += `⏱️ Execution Time: ${data.result.execution_time}s\n`
        }
        
        alertMessage += `\n🏆 Check the leaderboard for your ranking!`
        alert(alertMessage)
        
        // ✅ FIXED: Controlled refresh sequence - clear previous timeouts
        console.log('🔄 Starting controlled leaderboard refresh...')
        
        // Clear any existing refresh timeouts
        refreshTimeoutRefs.current.forEach(timeout => clearTimeout(timeout))
        refreshTimeoutRefs.current = []
        
        // Single immediate refresh
        fetchLeaderboard(examCode)
        
        // One follow-up refresh after 3 seconds
        const refreshTimeout = setTimeout(() => {
          fetchLeaderboard(examCode)
        }, 3000)
        
        refreshTimeoutRefs.current.push(refreshTimeout)
        
      } else {
        alert(`❌ Submission failed: ${data.error}`)
      }
      
    } catch (error) {
      console.error('❌ Submit network error:', error)
      alert('❌ Network error: Could not submit solution. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ✅ Manual refresh function
  const manualRefresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered')
    fetchLeaderboard(examCode)
  }, [examCode, fetchLeaderboard])

  // Test Results Display Component
  const TestResultsDisplay = ({ results }: { results: any[] }) => {
    if (!results || results.length === 0) return null

    return (
      <div className="mt-6 bg-gray-900 p-4 rounded border border-gray-600">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <TestTube className="h-5 w-5 text-blue-400" />
          <span>Test Results</span>
        </h4>
        
        <div className="space-y-3">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${
                result.passed 
                  ? 'bg-green-900 border-green-500 text-green-100' 
                  : 'bg-red-900 border-red-500 text-red-100'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">
                    Test {index + 1}: {result.passed ? '✅ PASSED' : '❌ FAILED'}
                  </span>
                  <span className="text-sm bg-black bg-opacity-30 px-2 py-1 rounded font-bold">
                    +{result.points_earned || 0} points
                  </span>
                </div>
              </div>
              
              {result.description && result.description !== `Test case ${index+1}` && (
                <p className="text-sm mb-2 opacity-80">{result.description}</p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {result.input && (
                  <div>
                    <span className="font-medium">Input:</span>
                    <code className="ml-2 bg-black bg-opacity-30 px-2 py-1 rounded">
                      "{result.input}"
                    </code>
                  </div>
                )}
                
                {result.expected_output && (
                  <div>
                    <span className="font-medium">Expected:</span>
                    <code className="ml-2 bg-black bg-opacity-30 px-2 py-1 rounded">
                      "{result.expected_output}"
                    </code>
                  </div>
                )}
                
                {result.actual_output && (
                  <div>
                    <span className="font-medium">Your Output:</span>
                    <code className="ml-2 bg-black bg-opacity-30 px-2 py-1 rounded">
                      "{result.actual_output}"
                    </code>
                  </div>
                )}
              </div>
              
              {!result.passed && result.error && (
                <div className="mt-2 p-2 bg-red-800 bg-opacity-50 rounded text-sm">
                  <span className="font-medium">Error:</span> {result.error}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const formatTime = (seconds: number) => {
    if (seconds < 0) return "00:00"
    
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white'
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white'
      case 3: return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (!examSession || !problem) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading exam interface...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header with Timer */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{problem.title}</h1>
            <p className="text-gray-400">Code: {examCode} | Participant: {examSession.student_name}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Timer */}
            {timeRemaining > 0 && (
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
                timeRemaining <= 300 ? 'bg-red-900' : timeRemaining <= 600 ? 'bg-yellow-900' : 'bg-green-900'
              }`}>
                <Clock className={`h-5 w-5 ${
                  timeRemaining <= 300 ? 'text-red-400' : timeRemaining <= 600 ? 'text-yellow-400' : 'text-green-400'
                }`} />
                <span className={`font-mono text-lg ${
                  timeRemaining <= 300 ? 'text-red-400' : timeRemaining <= 600 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
            
            {/* Participant Count */}
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-400" />
              <span>{examStats.total_participants || 0} participants</span>
            </div>
            
            {/* Submission Status Indicator */}
            {hasSubmitted && (
              <div className="flex items-center space-x-2 bg-green-900 px-3 py-1 rounded-lg">
                <Shield className="h-4 w-4 text-green-400" />
                <span className="text-green-200 text-sm">✅ Submitted</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Problem & Code Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Problem Description */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{problem.title}</h2>
              {hasSubmitted && (
                <div className="flex items-center space-x-1 text-green-400 text-sm">
                  <Shield className="h-4 w-4" />
                  <span>Solution Submitted</span>
                </div>
              )}
            </div>
            
            <div className="prose prose-invert">
              <p className="mb-4 text-gray-300">{problem.description}</p>
              
              <h4 className="text-lg font-semibold mb-2">Examples:</h4>
              {problem.examples.map((example, index) => (
                <div key={index} className="bg-gray-900 p-4 rounded mb-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-400">Input:</span>
                      <code className="ml-2 text-green-400">"{example.input}"</code>
                    </div>
                    <div>
                      <span className="text-blue-400">Output:</span>
                      <code className="ml-2 text-green-400">"{example.expected_output}"</code>
                    </div>
                  </div>
                  {example.description && (
                    <div className="mt-2 text-gray-400 text-sm">{example.description}</div>
                  )}
                </div>
              ))}

              <h4 className="text-lg font-semibold mb-2">Constraints:</h4>
              <ul className="list-disc list-inside mb-4 text-gray-300">
                {problem.constraints.map((constraint, index) => (
                  <li key={index}>{constraint}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Code Editor */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Your Solution</h3>
              
              {/* Language Selector */}
              <div className="flex items-center space-x-2">
                <Code className="h-4 w-4 text-gray-400" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  disabled={hasSubmitted}
                  className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500"
                >
                  {problem.languages.map(lang => (
                    <option key={lang} value={lang}>
                      {languageIcons[lang]} {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-64 bg-gray-900 text-green-400 font-mono p-4 rounded border border-gray-600 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={hasSubmitted}
              spellCheck={false}
              placeholder={hasSubmitted ? 'Solution submitted!' : `Write your ${selectedLanguage} solution here...`}
            />
            
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-400">
                Function: <code className="text-blue-400">{problem.function_name}</code>
                {hasSubmitted && (
                  <span className="ml-4 text-green-400">
                    ✅ Solution submitted successfully!
                  </span>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={runCode}
                  disabled={isRunning || hasSubmitted || !code.trim()}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded flex items-center space-x-2 transition-colors"
                >
                  <Play className="h-4 w-4" />
                  <span>{isRunning ? 'Running...' : 'Test Code'}</span>
                </button>
                
                <button
                  onClick={submitSolution} 
                  disabled={isSubmitting || hasSubmitted || !code.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded flex items-center space-x-2 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmitting ? 'Submitting...' : hasSubmitted ? 'Submitted ✅' : 'Submit Solution'}</span>
                </button>
              </div>
            </div>

            {/* Output Display */}
            {output && (
              <div className="mt-6 bg-gray-900 p-4 rounded">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Output:</h4>
                <pre className="text-green-400 text-sm whitespace-pre-wrap">{output}</pre>
              </div>
            )}
          </div>

          {/* Test Results Display */}
          {testResults.length > 0 && (
            <TestResultsDisplay results={testResults} />
          )}
        </div>

        {/* Enhanced Leaderboard */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Trophy className="h-6 w-6 text-yellow-400" />
              <h3 className="text-xl font-bold">Live Leaderboard</h3>
            </div>
            
            <button
              onClick={manualRefresh}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-2xl font-bold text-blue-400">{examStats.completed_submissions || 0}</div>
              <div className="text-xs text-gray-400">Submitted</div>
            </div>
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-2xl font-bold text-green-400">{Math.round(examStats.average_score || 0)}%</div>
              <div className="text-xs text-gray-400">Avg Score</div>
            </div>
          </div>

          {/* Leaderboard Display */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-300 mb-3">🏆 Rankings</h4>
            {leaderboard.length > 0 ? (
              leaderboard.map((participant) => (
                <div key={participant.name} className={`p-3 rounded-lg ${getRankColor(participant.rank)}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-lg">#{participant.rank}</span>
                      <div>
                        <div className={`font-medium ${participant.name === examSession.student_name ? 'underline font-bold' : ''}`}>
                          {participant.name}
                          {participant.name === examSession.student_name && ' (You) 🎯'}
                        </div>
                        <div className="text-xs opacity-75 flex items-center space-x-2">
                          {participant.language && (
                            <span>
                              {languageIcons[participant.language]} {participant.language}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-lg">{participant.score}%</span>
                      <div className="text-xs opacity-75">
                        Submitted ✅
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-4">
                No submissions yet
              </div>
            )}
          </div>

          {/* Waiting Participants */}
          {waitingParticipants.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-gray-300 mb-3">⏳ Still Working</h4>
              <div className="space-y-1">
                {waitingParticipants.map((participant) => (
                  <div key={participant.name} className="p-2 bg-gray-700 rounded text-sm flex items-center justify-between">
                    <span>
                      {participant.name}
                      {participant.name === examSession.student_name && ' (You)'}
                    </span>
                    <span className="text-yellow-400 text-xs">Working...</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
