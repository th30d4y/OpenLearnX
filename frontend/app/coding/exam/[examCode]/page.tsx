'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Clock, Users, Send, RefreshCw, Play, Code, Wallet, Shield } from 'lucide-react'

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
  // ✅ ADD TIMER INITIALIZED STATE
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
    
    // Start polling for updates
    const interval = setInterval(() => {
      fetchLeaderboard(session.exam_code)
    }, 3000)

    return () => clearInterval(interval)
  }, [router])

  // ✅ FIXED TIMER COUNTDOWN
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

  // ✅ FIXED TIMER CALCULATION IN FETCHLEADERBOARD
  const fetchLeaderboard = async (examCode: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/exam/leaderboard/${examCode}`)
      const data = await response.json()
      
      if (data.success) {
        setLeaderboard(data.leaderboard || [])
        setWaitingParticipants(data.waiting_participants || [])
        setExamStats(data.stats || {})
        
        // ✅ FIXED TIMER CALCULATION
        if (data.exam_info && data.exam_info.status === 'active') {
          if (data.exam_info.end_time) {
            const now = Date.now()
            const endTime = new Date(data.exam_info.end_time).getTime()
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
            
            console.log(`⏰ Timer calculation:`)
            console.log(`  Current: ${new Date(now).toISOString()}`)
            console.log(`  End: ${new Date(endTime).toISOString()}`)
            console.log(`  Remaining: ${remaining} seconds`)
            
            setTimeRemaining(remaining)
            if (!timerInitialized) {
              setTimerInitialized(true)
            }
          } else if (data.exam_info.start_time && data.exam_info.duration_minutes) {
            // Calculate from start_time + duration
            const startTime = new Date(data.exam_info.start_time).getTime()
            const durationMs = data.exam_info.duration_minutes * 60 * 1000
            const endTime = startTime + durationMs
            const now = Date.now()
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
            
            console.log(`⏰ Using start_time + duration - Remaining: ${remaining}s`)
            setTimeRemaining(remaining)
            if (!timerInitialized) {
              setTimerInitialized(true)
            }
          }
        } else if (data.exam_info && data.exam_info.status === 'waiting') {
          // Show full duration for waiting exams
          const fullSeconds = (data.exam_info.duration_minutes || 30) * 60
          setTimeRemaining(fullSeconds)
          if (!timerInitialized) {
            setTimerInitialized(true)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
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
      const response = await fetch('http://127.0.0.1:5000/api/exam/execute-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: selectedLanguage
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setOutput('Code executed successfully!')
        setTestResults(result.test_results || [])
      } else {
        setOutput(`Error: ${result.error}`)
      }
    } catch (error) {
      setOutput(`Execution failed: ${(error as Error).message}`)
    } finally {
      setIsRunning(false)
    }
  }

  const submitSolution = async () => {
    if (!code.trim()) {
      alert('Please write some code before submitting!')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('http://127.0.0.1:5000/api/exam/submit-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: selectedLanguage
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setHasSubmitted(true)
        setTestResults(data.test_results || [])
        
        let alertMessage = `Solution submitted successfully!\nScore: ${data.score}%\nPassed: ${data.passed_tests}/${data.total_tests} tests`
        
        if (data.blockchain_verified) {
          alertMessage += `\n🔗 Blockchain Verified: ${data.wallet_address?.slice(0, 6)}...${data.wallet_address?.slice(-4)}`
        }
        
        alert(alertMessage)
        fetchLeaderboard(examSession!.exam_code)
      } else {
        alert(data.error || 'Failed to submit solution')
      }
    } catch (error) {
      alert('Failed to submit solution. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ✅ FIXED TIME FORMATTING
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
            <p className="text-gray-400">Code: {examSession.exam_code}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* ✅ FIXED TIMER DISPLAY */}
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
            
            {/* Wallet Info Display */}
            {examSession.blockchain_verified && examSession.wallet_address && (
              <div className="flex items-center space-x-2 bg-green-900 px-3 py-1 rounded-lg">
                <Wallet className="h-4 w-4 text-green-400" />
                <span className="text-green-200 text-sm font-mono">
                  {examSession.wallet_address.slice(0, 6)}...{examSession.wallet_address.slice(-4)}
                </span>
                <Shield className="h-4 w-4 text-green-400" />
              </div>
            )}
            
            {/* Participant Count */}
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-400" />
              <span>{examStats.total_participants || 0} participants</span>
              {examStats.blockchain_participants > 0 && (
                <span className="text-green-400 text-sm">
                  ({examStats.blockchain_participants} 🔗)
                </span>
              )}
            </div>
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
              {examSession.blockchain_verified && (
                <div className="flex items-center space-x-1 text-green-400 text-sm">
                  <Shield className="h-4 w-4" />
                  <span>Blockchain Verified</span>
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
              placeholder={`Write your ${selectedLanguage} solution here...`}
            />
            
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-400">
                Function: <code className="text-blue-400">{problem.function_name}</code>
                {hasSubmitted && (
                  <span className="ml-4 text-green-400">
                    ✅ Solution submitted
                    {examSession.blockchain_verified && (
                      <span className="ml-2">🔗 Blockchain verified</span>
                    )}
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
                  <span>{isSubmitting ? 'Submitting...' : hasSubmitted ? 'Submitted' : 'Submit Solution'}</span>
                </button>
              </div>
            </div>

            {/* Output & Test Results */}
            {(output || testResults.length > 0) && (
              <div className="mt-6 bg-gray-900 p-4 rounded">
                {output && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Output:</h4>
                    <pre className="text-green-400 text-sm whitespace-pre-wrap">{output}</pre>
                  </div>
                )}
                
                {testResults.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Test Results:</h4>
                    <div className="space-y-2">
                      {testResults.map((result, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded text-sm ${
                            result.passed ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium">
                                Test {index + 1}: {result.passed ? '✅ Passed' : '❌ Failed'}
                              </span>
                              {result.input && (
                                <div className="text-xs mt-1 opacity-75">
                                  Input: "{result.input}"
                                </div>
                              )}
                            </div>
                            {!result.passed && result.error && (
                              <span className="text-xs text-right">{result.error}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Trophy className="h-6 w-6 text-yellow-400" />
              <h3 className="text-xl font-bold">Live Leaderboard</h3>
            </div>
            
            <button
              onClick={() => fetchLeaderboard(examSession.exam_code)}
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
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-2xl font-bold text-purple-400">{examStats.highest_score || 0}%</div>
              <div className="text-xs text-gray-400">Top Score</div>
            </div>
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-2xl font-bold text-orange-400">{examStats.waiting_submissions || 0}</div>
              <div className="text-xs text-gray-400">Working</div>
            </div>
          </div>

          {/* Blockchain Stats */}
          {examStats.blockchain_participants > 0 && (
            <div className="bg-green-900 p-3 rounded mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-green-200">{examStats.blockchain_participants}</div>
                  <div className="text-xs text-green-300">Blockchain Verified</div>
                </div>
                <Shield className="h-6 w-6 text-green-400" />
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-300 mb-3">🏆 Rankings</h4>
            {leaderboard.length > 0 ? (
              leaderboard.map((participant) => (
                <div key={participant.name} className={`p-3 rounded-lg ${getRankColor(participant.rank)}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-lg">#{participant.rank}</span>
                      <div>
                        <div className={`font-medium ${participant.name === examSession.student_name ? 'underline' : ''}`}>
                          {participant.name}
                          {participant.name === examSession.student_name && ' (You)'}
                          {participant.blockchain_verified && (
                            <Shield className="inline h-3 w-3 ml-1 text-green-400" />
                          )}
                        </div>
                        <div className="text-xs opacity-75 flex items-center space-x-2">
                          {participant.language && (
                            <span>
                              {languageIcons[participant.language]} {participant.language}
                            </span>
                          )}
                          {participant.wallet_short && (
                            <span className="font-mono text-green-300">
                              {participant.wallet_short}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-lg">{participant.score}%</span>
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
                    {participant.blockchain_verified && (
                      <Shield className="h-3 w-3 text-green-400" />
                    )}
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
