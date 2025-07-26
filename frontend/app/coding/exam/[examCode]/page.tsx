'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()

  const languageIcons: {[key: string]: string} = {
    python: '🐍',
    java: '☕',
    c: '⚡',
    bash: '💻'
  }

  useEffect(() => {
    const sessionData = localStorage.getItem('exam_session')
    if (!sessionData) {
      router.push('/coding/join')
      return
    }

    const session = JSON.parse(sessionData)
    setExamSession(session)
    
    // Fetch problem details
    fetchProblem(session.exam_code)
    
    // More frequent polling for real-time updates
    const interval = setInterval(() => {
      fetchLeaderboard(session.exam_code)
    }, 2000)

    return () => clearInterval(interval)
  }, [router])

  // Timer countdown
  useEffect(() => {
    if (!timerInitialized || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = Math.max(0, prev - 1)
        if (newTime === 0) {
          alert('⏰ Time is up! Exam has ended.')
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timerInitialized, timeRemaining])

  const fetchProblem = async (examCode: string) => {
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
  }

  // ✅ ENHANCED: More aggressive leaderboard fetching with better debugging
  const fetchLeaderboard = async (examCode: string) => {
    try {
      console.log('🏆 Fetching leaderboard for:', examCode)
      
      // Add cache busting to prevent stale data
      const response = await fetch(`http://127.0.0.1:5000/api/exam/leaderboard/${examCode}?t=${Date.now()}`)
      const data = await response.json()
      
      console.log('📦 Leaderboard data received:', {
        success: data.success,
        completed_count: data.leaderboard?.length || 0,
        waiting_count: data.waiting_participants?.length || 0,
        ultimate_fix_applied: data.ultimate_fix_applied
      })
      
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
        
        // ✅ ENHANCED: Better user status checking
        const currentUser = examSession?.student_name
        if (currentUser) {
          const userInCompleted = data.leaderboard.find((p: Participant) => p.name === currentUser)
          const userInWaiting = data.waiting_participants.find((p: Participant) => p.name === currentUser)
          
          console.log(`👤 User status check:`, {
            username: currentUser,
            in_completed: !!userInCompleted,
            in_waiting: !!userInWaiting,
            current_hasSubmitted: hasSubmitted,
            user_score: userInCompleted?.score
          })
          
          if (userInCompleted && !hasSubmitted) {
            console.log('✅ User found in completed leaderboard, updating hasSubmitted state')
            setHasSubmitted(true)
          }
        }
        
        // Debug logging for leaderboard content
        if (data.leaderboard.length > 0) {
          console.log('🏆 Completed participants:', data.leaderboard.map((p: any) => `${p.name}: ${p.score}%`))
        }
        if (data.waiting_participants.length > 0) {
          console.log('⏳ Waiting participants:', data.waiting_participants.map((p: any) => p.name))
        }
        
      } else {
        console.error('❌ Leaderboard fetch failed:', data.error)
      }
    } catch (error) {
      console.error('❌ Failed to fetch leaderboard:', error)
    }
  }

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

  // ✅ COMPLETELY FIXED SUBMIT SOLUTION with aggressive leaderboard refresh
  const submitSolution = async () => {
    if (!code.trim()) {
      alert('Please write some code before submitting!')
      return
    }

    if (!confirm('Submit your solution? This cannot be undone.')) return

    setIsSubmitting(true)

    try {
      console.log('📤 Submitting solution...')
      console.log('👤 Participant:', examSession?.student_name)
      console.log('🔢 Exam Code:', examSession?.exam_code)
      
      const response = await fetch('http://127.0.0.1:5000/api/exam/submit-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_code: examSession?.exam_code,
          language: selectedLanguage,
          code: code,
          participant_name: examSession?.student_name || 'Anonymous'
        })
      })

      const data = await response.json()
      console.log('📦 Submit result:', data)
      
      if (data.success) {
        setHasSubmitted(true)
        setTestResults(data.test_results || [])
        
        // ✅ ENHANCED: Detailed alert with proper test results formatting
        let alertMessage = `🎉 Solution submitted successfully!\n\n`
        alertMessage += `📊 Overall Score: ${data.score}%\n`
        alertMessage += `✅ Tests Passed: ${data.passed_tests}/${data.total_tests}\n`
        
        if (data.execution_time) {
          alertMessage += `⏱️ Execution Time: ${data.execution_time}s\n`
        }
        
        // Enhanced test results display in alert
        if (data.test_results && data.test_results.length > 0) {
          alertMessage += `\n📋 Detailed Test Results:\n`
          alertMessage += `${'='.repeat(30)}\n`
          
          data.test_results.forEach((test: any, i: number) => {
            const status = test.passed ? '✅ PASSED' : '❌ FAILED'
            const points = test.points_earned || 0
            
            alertMessage += `Test ${i+1}: ${status} (+${points} points)\n`
            
            if (test.description && test.description !== `Test case ${i+1}`) {
              alertMessage += `  Description: ${test.description}\n`
            }
            
            if (test.input) {
              alertMessage += `  Input: "${test.input}"\n`
            }
            
            if (test.expected_output) {
              alertMessage += `  Expected: "${test.expected_output}"\n`
            }
            
            if (test.actual_output) {
              alertMessage += `  Your Output: "${test.actual_output}"\n`
            }
            
            if (!test.passed && test.error) {
              alertMessage += `  Error: ${test.error}\n`
            }
            
            alertMessage += `\n`
          })
          
          // Add summary
          const totalPoints = data.test_results.reduce((sum: number, test: any) => sum + (test.points_earned || 0), 0)
          const maxPoints = data.scoring_details?.total_points || 100
          alertMessage += `📈 Points Earned: ${totalPoints}/${maxPoints}\n`
        }
        
        alertMessage += `\n🏆 Your score will appear in the leaderboard shortly!`
        
        alert(alertMessage)
        
        // ✅ CRITICAL FIX: Aggressive leaderboard refresh sequence
        console.log('🔄 Starting aggressive leaderboard refresh sequence...')
        
        // Immediate refresh
        setTimeout(() => {
          console.log('🔄 Refresh 1/6 - Immediate')
          fetchLeaderboard(examSession!.exam_code)
        }, 200)
        
        // Quick follow-up
        setTimeout(() => {
          console.log('🔄 Refresh 2/6 - Quick follow-up')
          fetchLeaderboard(examSession!.exam_code)
        }, 800)
        
        // Medium delay
        setTimeout(() => {
          console.log('🔄 Refresh 3/6 - Medium delay')
          fetchLeaderboard(examSession!.exam_code)
        }, 2000)
        
        // Longer delay
        setTimeout(() => {
          console.log('🔄 Refresh 4/6 - Longer delay')
          fetchLeaderboard(examSession!.exam_code)
        }, 4000)
        
        // Extended delay
        setTimeout(() => {
          console.log('🔄 Refresh 5/6 - Extended delay')
          fetchLeaderboard(examSession!.exam_code)
        }, 7000)
        
        // Final refresh
        setTimeout(() => {
          console.log('🔄 Refresh 6/6 - Final check')
          fetchLeaderboard(examSession!.exam_code)
        }, 10000)
        
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

  // ✅ Enhanced Test Results Display Component
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
        
        {/* Summary */}
        <div className="mt-4 p-3 bg-blue-900 bg-opacity-50 rounded">
          <div className="flex justify-between text-sm">
            <span>
              Passed: {results.filter(r => r.passed).length}/{results.length} tests
            </span>
            <span>
              Points: {results.reduce((sum, r) => sum + (r.points_earned || 0), 0)} total
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Debug function for troubleshooting
  const debugLeaderboard = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/exam/leaderboard/${examSession?.exam_code}`)
      const data = await response.json()
      
      console.log('🐛 DEBUG LEADERBOARD:', {
        success: data.success,
        completed_count: data.leaderboard?.length || 0,
        waiting_count: data.waiting_participants?.length || 0,
        my_name: examSession?.student_name,
        in_completed: data.leaderboard?.find((p: any) => p.name === examSession?.student_name),
        in_waiting: data.waiting_participants?.find((p: any) => p.name === examSession?.student_name),
        ultimate_fix_applied: data.ultimate_fix_applied,
        full_leaderboard: data.leaderboard,
        full_waiting: data.waiting_participants
      })
      
      alert(`Debug Info:\nCompleted: ${data.leaderboard?.length || 0}\nWaiting: ${data.waiting_participants?.length || 0}\nCheck console for details`)
    } catch (error) {
      console.error('Debug error:', error)
    }
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
            <p className="text-gray-400">Code: {examSession.exam_code} | Participant: {examSession.student_name}</p>
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

          {/* ✅ Enhanced Test Results Display */}
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
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchLeaderboard(examSession.exam_code)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              
              {/* Debug button - remove in production */}
              <button
                onClick={debugLeaderboard}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                title="Debug"
              >
                🐛
              </button>
            </div>
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
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-2xl font-bold text-purple-400">{examStats.highest_score || 0}%</div>
              <div className="text-xs text-gray-400">Top Score</div>
            </div>
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-2xl font-bold text-orange-400">{examStats.waiting_submissions || 0}</div>
              <div className="text-xs text-gray-400">Working</div>
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
