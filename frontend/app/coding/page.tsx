'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Lock, Shield, AlertTriangle, Users, Trophy, Clock, Code, Zap, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type UserRole = 'selector' | 'host' | 'participant'

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
  const [code, setCode] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)

  const router = useRouter()

  const checkSystemRequirements = () => {
    const checks = {
      fullscreenSupported: document.fullscreenEnabled,
      webGLSupported: !!document.createElement('canvas').getContext('webgl'),
      localStorageSupported: typeof Storage !== 'undefined',
      cookiesEnabled: navigator.cookieEnabled,
    }
    const allPassed = Object.values(checks).every(c => c)
    if (allPassed) {
      setSystemChecked(true)
      alert('System requirements check passed!')
    } else {
      alert('System requirements not met. Please use a modern browser.')
    }
    return allPassed
  }

  const acceptSystemRequirements = () => {
    if (checkSystemRequirements()) enableSecureMode()
  }

  const enableSecureMode = () => {
    document.documentElement.requestFullscreen().then(() => {
      setIsSecureMode(true)
      disableBrowserFeatures()
      detectVirtualEnvironment()
      if (examInfo?.status === 'active') startExamTimer()
    }).catch(() => {
      alert('Fullscreen mode is required for secure coding')
    })
  }

  const disableBrowserFeatures = () => {
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
          host_name: participantName,
          max_participants: 50,
        }),
      })
      const data = await response.json()
      if (data.success) {
        const participantCode = data.exam_code
        const databaseId = data.exam_id
        setExamId(participantCode)
        setExamInfo({ title: 'String Capitalizer Challenge', status: 'waiting' })
        localStorage.setItem('host_exam', JSON.stringify({
          exam_code: participantCode,
          exam_id: databaseId,
          host_name: participantName,
          created_at: new Date().toISOString(),
          exam_details: data.exam_details || {},
        }))
        alert(`Exam Created!\n\nExam Code: ${participantCode}\nTitle: String Capitalizer Challenge\nHost: ${participantName}\nDuration: 30 minutes\n\nRedirecting to Host Panel...`)
        setTimeout(() => router.push(`/coding/host/${participantCode}`), 2000)
      } else {
        alert(`Failed to create exam: ${data.error}`)
      }
    } catch (error) {
      alert('Failed to create exam — network error')
    }
  }

  const joinExam = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/exam/join-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_code: examId, student_name: participantName }),
      })
      const data = await response.json()
      if (data.success) {
        setExamInfo(data.exam_info)
        localStorage.setItem('exam_session', JSON.stringify({
          exam_code: examId,
          student_name: participantName,
          exam_info: data.exam_info,
          joined_at: new Date().toISOString(),
        }))
        alert(`Joined: ${data.exam_info.title}\n\nParticipants: ${data.exam_info.participants_count}/${data.exam_info.max_participants}\nDuration: ${data.exam_info.duration_minutes} minutes\n\nRedirecting to exam...`)
        setTimeout(() => router.push('/coding/exam'), 1500)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Failed to join exam — network error')
    }
  }

  const startExam = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/exam/start-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_code: examId }),
      })
      const data = await response.json()
      if (data.success) {
        setExamInfo((prev: any) => ({ ...prev, status: 'active' }))
        alert('Exam started! Participants can now begin coding.')
        startExamTimer()
      }
    } catch {
      alert('Failed to start exam')
    }
  }

  const startExamTimer = () => {
    const duration = 30 * 60
    setTimeRemaining(duration)
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) { clearInterval(timer); alert('Time is up!'); return 0 }
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
        body: JSON.stringify({ code }),
      })
      const data = await response.json()
      if (data.success) {
        alert(`Solution submitted! Your score: ${data.score}%`)
        fetchLeaderboard()
      }
    } catch {
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
    } catch {
      console.error('Failed to fetch leaderboard')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Role selection
  if (userRole === 'selector') {
    return (
      <div className="bg-background py-24 px-4">
        <div className="max-w-sm mx-auto">
          <div className="mb-8">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card mb-4">
              <Code className="h-5 w-5 text-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Coding Exam</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choose your role to get started</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Button onClick={() => setUserRole('host')} className="w-full gap-2" size="lg">
              <Users className="h-4 w-4" />
              Host an Exam
            </Button>
            <Button onClick={() => setUserRole('participant')} variant="outline" className="w-full gap-2" size="lg">
              <Play className="h-4 w-4" />
              Join an Exam
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Host setup
  if (userRole === 'host' && !examId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-4">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Host Coding Exam</h1>
            <p className="mt-1 text-sm text-muted-foreground">Create a secure coding environment for participants</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="host-name">Your name</Label>
              <Input
                id="host-name"
                type="text"
                placeholder="Enter your name"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
              />
            </div>
            <Button onClick={createExam} disabled={!participantName} className="w-full" size="lg">
              Create Exam
            </Button>
          </div>

          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 space-y-1.5 text-xs text-muted-foreground">
            <p className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-primary" /> Host: &quot;{participantName}&quot;</p>
            <p className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-primary" /> Displays exam_code (6 chars)</p>
            <p className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-primary" /> Redirects to /coding/host/[code]</p>
          </div>
        </div>
      </div>
    )
  }

  // Join exam
  if (userRole === 'participant' && !examInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-4">
              <Play className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Join Coding Exam</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter the exam code to participate</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="exam-code">Exam code</Label>
              <Input
                id="exam-code"
                type="text"
                placeholder="e.g. 3BPIBZ"
                value={examId}
                onChange={(e) => setExamId(e.target.value.toUpperCase())}
                maxLength={6}
                className="font-mono text-center tracking-widest uppercase text-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="participant-name">Your name</Label>
              <Input
                id="participant-name"
                type="text"
                placeholder="Enter your name"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
              />
            </div>
            <Button onClick={joinExam} disabled={!examId || !participantName} className="w-full" size="lg">
              Join Exam
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // System requirements check
  if (!systemChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 mb-4">
              <Shield className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">System Requirements</h1>
            <p className="mt-1 text-sm text-muted-foreground">Preparing secure exam environment</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-3 mb-4">
            {[
              { icon: Shield, label: 'Fullscreen mode support', desc: 'Required for secure examination', ok: true },
              { icon: Lock, label: 'Copy/paste will be disabled', desc: 'Prevents unauthorized assistance', ok: false },
              { icon: AlertTriangle, label: 'Virtual environments will be detected', desc: 'Ensures exam integrity', ok: false },
            ].map(({ icon: Icon, label, desc, ok }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20">
                <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                {ok ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                )}
              </div>
            ))}
          </div>

          <Button onClick={acceptSystemRequirements} className="w-full gap-2" size="lg">
            <Lock className="h-4 w-4" />
            Accept & Enter Secure Mode
          </Button>

          <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Browser restrictions will be enforced during the examination period.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main exam interface
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Security bar */}
      <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-semibold tracking-wide">
            <Shield className="h-4 w-4" /> SECURE MODE
          </span>
          <span className="flex items-center gap-1.5 text-destructive-foreground/80">
            <Lock className="h-3.5 w-3.5" /> Copy/Paste Disabled
          </span>
          <span className="flex items-center gap-1.5 text-destructive-foreground/80">
            <AlertTriangle className="h-3.5 w-3.5" /> VM Detection Active
          </span>
        </div>
        <div className="flex items-center gap-4">
          {timeRemaining > 0 && (
            <span className="flex items-center gap-1.5 font-mono font-bold">
              <Clock className="h-4 w-4" />
              {formatTime(timeRemaining)}
              {timeRemaining < 300 && <span className="h-2 w-2 bg-yellow-300 rounded-full animate-pulse" />}
            </span>
          )}
          <span className="font-mono text-destructive-foreground/80">Exam: {examId}</span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Coding area */}
        <div className="flex-1 p-6 space-y-5 overflow-y-auto">
          {/* Problem */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Code className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-card-foreground">Problem: String Capitalizer</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Write a function that converts a string to uppercase.
            </p>
            <div className="rounded-lg bg-muted/50 border border-border p-4">
              <pre className="text-sm font-mono text-foreground">
{`def capitalize_string(text):
    # Your code here
    pass

# Test: capitalize_string("hello") should return "HELLO"`}
              </pre>
            </div>
          </div>

          {/* Editor */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-card-foreground">Code Editor</h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Ready
                </span>
                <span className="font-mono">Lines: {code.split('\n').length} | Chars: {code.length}</span>
              </div>
            </div>

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="def capitalize_string(text):\n    # Your code here\n    pass"
              className="w-full h-72 rounded-lg border border-border bg-muted/30 text-foreground font-mono text-sm p-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
            />

            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <Button onClick={submitSolution} disabled={isExecuting} className="gap-2">
                  {isExecuting ? (
                    <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isExecuting ? 'Submitting…' : 'Submit Solution'}
                </Button>

                {userRole === 'host' && examInfo?.status === 'waiting' && (
                  <Button onClick={startExam} variant="outline" className="gap-2">
                    <Zap className="h-4 w-4" />
                    Start Exam
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Python 3.9
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  Syntax OK
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="w-80 border-l border-border bg-card p-5 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-card-foreground">Leaderboard</h3>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium text-foreground">{leaderboard.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {leaderboard.filter(p => p.completed).length}
              </span>
            </div>
          </div>

          <div className="space-y-2 flex-1">
            {leaderboard.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No participants yet</p>
              </div>
            ) : (
              leaderboard.map((participant, index) => (
                <div key={index} className="rounded-lg border border-border bg-background p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' :
                        index === 1 ? 'bg-muted text-muted-foreground' :
                        index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground truncate">{participant.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-sm font-semibold text-foreground">{participant.score}%</span>
                      {participant.completed && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1">
                    <div
                      className="h-1 rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${participant.score}%` }}
                    />
                  </div>
                  {participant.submitted_at && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(participant.submitted_at).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <Button onClick={fetchLeaderboard} variant="outline" size="sm" className="w-full">
            Refresh Leaderboard
          </Button>
        </div>
      </div>
    </div>
  )
}
