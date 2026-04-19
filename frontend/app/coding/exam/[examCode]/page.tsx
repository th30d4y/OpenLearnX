'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Trophy, Clock, Users, Send, RefreshCw, Play, Code, Shield, TestTube } from 'lucide-react'

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
  const [leftTab, setLeftTab] = useState<'description' | 'examples' | 'constraints'>('description')
  const [rightTab, setRightTab] = useState<'result' | 'leaderboard'>('result')

  // ✅ CRITICAL FIX: Use refs to prevent infinite loops
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const refreshTimeoutRefs = useRef<NodeJS.Timeout[]>([])
  const isInitializedRef = useRef(false)

  const languageIcons: {[key: string]: string} = {
    python: 'Py',
    java: 'Java',
    javascript: 'JS',
    c: 'C',
    bash: 'Sh'
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
          alert('Time is up. Exam has ended.')
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
        setOutput(`Output:\n${result.output}`)
        if (result.execution_time) {
          setOutput(prev => prev + `\nExecution time: ${result.execution_time}s`)
        }
      } else {
        setOutput(`Error:\n${result.error}`)
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
        
        let alertMessage = `Solution submitted successfully.\n\n`
        alertMessage += `Overall Score: ${data.result?.score || 0}%\n`
        alertMessage += `Tests Passed: ${data.result?.passed_tests || 0}/${data.result?.total_tests || 1}\n`
        
        if (data.result?.execution_time) {
          alertMessage += `Execution Time: ${data.result.execution_time}s\n`
        }
        
        alertMessage += `\nCheck the leaderboard for your ranking.`
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
        alert(`Submission failed: ${data.error}`)
      }
      
    } catch (error) {
      console.error('Submit network error:', error)
      alert('Network error: Could not submit solution. Please try again.')
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
      <div className="mt-6 rounded border border-border bg-secondary/40 p-4">
        <h4 className="mb-4 flex items-center space-x-2 text-lg font-semibold text-foreground">
          <TestTube className="h-5 w-5 text-primary" />
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
                    Test {index + 1}: {result.passed ? 'PASSED' : 'FAILED'}
                  </span>
                  <span className="rounded bg-secondary px-2 py-1 text-sm font-bold text-secondary-foreground">
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
                    <code className="ml-2 rounded bg-secondary px-2 py-1 text-secondary-foreground">
                      "{result.input}"
                    </code>
                  </div>
                )}
                
                {result.expected_output && (
                  <div>
                    <span className="font-medium">Expected:</span>
                    <code className="ml-2 rounded bg-secondary px-2 py-1 text-secondary-foreground">
                      "{result.expected_output}"
                    </code>
                  </div>
                )}
                
                {result.actual_output && (
                  <div>
                    <span className="font-medium">Your Output:</span>
                    <code className="ml-2 rounded bg-secondary px-2 py-1 text-secondary-foreground">
                      "{result.actual_output}"
                    </code>
                  </div>
                )}
              </div>
              
              {!result.passed && result.error && (
                <div className="mt-2 rounded bg-red-100 p-2 text-sm text-red-800 dark:bg-red-900/40 dark:text-red-200">
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
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading exam interface...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">{problem.title}</h1>
            <p className="text-xs text-muted-foreground">Code: {examCode} | Participant: {examSession.student_name}</p>
          </div>

          <div className="flex items-center gap-3">
            {timeRemaining > 0 && (
              <div className={`rounded-md px-3 py-1 text-sm font-mono ${
                timeRemaining <= 300 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : timeRemaining <= 600 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              }`}>
                <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {formatTime(timeRemaining)}</span>
              </div>
            )}
            <div className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" /> {examStats.total_participants || 0}
            </div>
            {hasSubmitted && (
              <div className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-sm text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Shield className="h-4 w-4" /> Submitted
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="h-[calc(100vh-73px)] p-3">
        <div className="grid h-full grid-cols-1 gap-3 xl:grid-cols-5">
          <section className="xl:col-span-2 flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex border-b border-border text-sm">
              <button onClick={() => setLeftTab('description')} className={`px-4 py-2 ${leftTab === 'description' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`}>Description</button>
              <button onClick={() => setLeftTab('examples')} className={`px-4 py-2 ${leftTab === 'examples' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`}>Examples</button>
              <button onClick={() => setLeftTab('constraints')} className={`px-4 py-2 ${leftTab === 'constraints' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`}>Constraints</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm text-muted-foreground">
              {leftTab === 'description' && <p className="leading-7">{problem.description}</p>}
              {leftTab === 'examples' && (
                <div className="space-y-3">
                  {problem.examples.map((example, index) => (
                    <div key={index} className="rounded-lg border border-border bg-secondary/40 p-3">
                      <p className="font-medium text-foreground">Example {index + 1}</p>
                      <p className="mt-1"><span className="text-muted-foreground">Input:</span> <code className="text-primary">{example.input}</code></p>
                      <p><span className="text-muted-foreground">Output:</span> <code className="text-primary">{example.expected_output}</code></p>
                      {example.description ? <p className="mt-1 text-xs text-muted-foreground">{example.description}</p> : null}
                    </div>
                  ))}
                </div>
              )}
              {leftTab === 'constraints' && (
                <ul className="space-y-2">
                  {problem.constraints.map((constraint, index) => (
                    <li key={index} className="rounded border border-border bg-secondary/40 px-3 py-2">{constraint}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="xl:col-span-3 flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Code className="h-4 w-4" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  disabled={hasSubmitted}
                  className="rounded border border-border bg-secondary px-2 py-1 text-sm text-secondary-foreground"
                >
                  {problem.languages.map(lang => (
                    <option key={lang} value={lang}>{languageIcons[lang]} {lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">Function: {problem.function_name}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={runCode}
                  disabled={isRunning || hasSubmitted || !code.trim()}
                  className="inline-flex items-center gap-1 rounded bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:bg-accent disabled:opacity-60"
                >
                  <Play className="h-4 w-4" /> {isRunning ? 'Running...' : 'Run'}
                </button>
                <button
                  onClick={submitSolution}
                  disabled={isSubmitting || hasSubmitted || !code.trim()}
                  className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" /> {isSubmitting ? 'Submitting...' : hasSubmitted ? 'Submitted' : 'Submit'}
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 border-b border-border">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-full w-full resize-none bg-background p-4 font-mono text-sm text-foreground outline-none"
                disabled={hasSubmitted}
                spellCheck={false}
                placeholder={hasSubmitted ? 'Solution submitted.' : `Write your ${selectedLanguage} solution here...`}
              />
            </div>

            <div className="h-[40%] min-h-[240px]">
              <div className="flex items-center justify-between border-b border-border px-2">
                <div className="flex text-sm">
                  <button onClick={() => setRightTab('result')} className={`px-3 py-2 ${rightTab === 'result' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`}>Test Result</button>
                  <button onClick={() => setRightTab('leaderboard')} className={`px-3 py-2 ${rightTab === 'leaderboard' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`}>Leaderboard</button>
                </div>
                {rightTab === 'leaderboard' && (
                  <button onClick={manualRefresh} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground" title="Refresh">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="h-[calc(100%-41px)] overflow-y-auto p-4">
                {rightTab === 'result' && (
                  <div className="space-y-3">
                    {output ? (
                      <div className="rounded border border-border bg-secondary/40 p-3">
                        <pre className="whitespace-pre-wrap text-sm text-foreground">{output}</pre>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Run your code to see output.</p>
                    )}
                    {testResults.length > 0 ? <TestResultsDisplay results={testResults} /> : null}
                  </div>
                )}

                {rightTab === 'leaderboard' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded border border-border bg-secondary/40 p-3">
                        <p className="text-xl font-bold text-primary">{examStats.completed_submissions || 0}</p>
                        <p className="text-xs text-muted-foreground">Submitted</p>
                      </div>
                      <div className="rounded border border-border bg-secondary/40 p-3">
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{Math.round(examStats.average_score || 0)}%</p>
                        <p className="text-xs text-muted-foreground">Average Score</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground"><Trophy className="h-4 w-4 text-yellow-500" /> Rankings</h4>
                      {leaderboard.length > 0 ? leaderboard.map((participant) => (
                        <div key={participant.name} className={`rounded p-3 ${getRankColor(participant.rank)}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`font-medium ${participant.name === examSession.student_name ? 'underline' : ''}`}>
                                #{participant.rank} {participant.name}{participant.name === examSession.student_name ? ' (You)' : ''}
                              </p>
                              <p className="text-xs opacity-80">{participant.language || 'language'} • submitted</p>
                            </div>
                            <p className="font-semibold">{participant.score}%</p>
                          </div>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">No submissions yet.</p>}
                    </div>

                    {waitingParticipants.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-foreground">Still Working</h4>
                        <div className="space-y-1">
                          {waitingParticipants.map((participant) => (
                            <div key={participant.name} className="flex items-center justify-between rounded bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                              <span>{participant.name}{participant.name === examSession.student_name ? ' (You)' : ''}</span>
                              <span className="text-xs text-amber-600 dark:text-amber-300">Working...</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
