'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, BarChart2, Code, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function CreateExam() {
  const [examData, setExamData] = useState({
    title: 'String Capitalizer Challenge',
    host_name: '',
    duration_minutes: 30,
    max_participants: 50,
    problem_id: 'string-capitalizer',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleInputChange = (field: string, value: any) => {
    setExamData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const createExam = async () => {
    setError(''); setResult('')
    if (!examData.title.trim()) { setError('Please enter exam title'); return }
    if (!examData.host_name.trim()) { setError('Please enter host name'); return }
    setLoading(true)
    try {
      const payload = {
        title: examData.title.trim(),
        problem_id: examData.problem_id,
        duration_minutes: examData.duration_minutes,
        host_name: examData.host_name.trim(),
        max_participants: examData.max_participants,
      }
      const response = await fetch('http://127.0.0.1:5000/api/exam/create-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (data.success) {
        const participantCode = data.exam_code
        const databaseId = data.exam_id
        if (!participantCode) { setError('Backend did not return exam_code. Check backend logs.'); return }
        setResult(`Exam created! Share code with participants: ${participantCode}`)
        localStorage.setItem('created_exam', JSON.stringify({
          exam_code: participantCode, exam_id: databaseId,
          exam_details: data.exam_details, host_name: examData.host_name,
          created_at: new Date().toISOString(),
        }))
        setTimeout(() => { router.push(`/coding/host/${participantCode}`) }, 3000)
      } else {
        setError(data.error || 'Failed to create exam')
      }
    } catch {
      setError('Network error: Could not connect to backend server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-xl border border-border bg-card p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-card-foreground">Create Coding Exam</h1>
          <p className="text-sm text-muted-foreground">Set up a new coding challenge for participants</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="exam-title">Exam Title</Label>
            <Input id="exam-title" value={examData.title} onChange={e => handleInputChange('title', e.target.value)} placeholder="Enter exam title" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="host-name">Host / Instructor Name</Label>
            <Input id="host-name" value={examData.host_name} onChange={e => handleInputChange('host_name', e.target.value)} placeholder="Enter your name" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input id="duration" type="number" min="5" max="180" value={examData.duration_minutes} onChange={e => handleInputChange('duration_minutes', parseInt(e.target.value) || 30)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max-p">Max Participants</Label>
              <Input id="max-p" type="number" min="1" max="200" value={examData.max_participants} onChange={e => handleInputChange('max_participants', parseInt(e.target.value) || 50)} />
            </div>
          </div>
          <Button onClick={createExam} disabled={loading || !examData.title.trim() || !examData.host_name.trim()} className="w-full gap-2" size="lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'Creating Exam…' : 'Create Exam'}
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">{result}</p>
          </div>
        )}

        <div className="border-t border-border pt-4 grid grid-cols-2 gap-2">
          {[
            [CheckCircle, 'text-emerald-500', 'Real-time participant tracking'],
            [BarChart2, 'text-primary', 'Live leaderboard'],
            [Code, 'text-primary', 'Multi-language support'],
            [Clock, 'text-amber-500', 'Timed exam sessions'],
          ].map(([Icon, color, text], i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              {/* @ts-ignore */}
              <Icon className={`h-3.5 w-3.5 ${color} shrink-0`} />
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
