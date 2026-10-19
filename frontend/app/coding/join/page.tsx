'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function JoinExam() {
  const [examCode, setExamCode] = useState('')
  const [studentName, setStudentName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!examCode.trim()) { setError('Please enter the exam code'); return }
    if (!studentName.trim()) { setError('Please enter your name'); return }
    setLoading(true)
    try {
      const token = localStorage.getItem('openlearnx_jwt_token') || localStorage.getItem('openlearnx_token')
      const storedUser = JSON.parse(localStorage.getItem('openlearnx_user') || 'null')
      const payload = {
        exam_code: examCode.trim().toUpperCase(),
        student_name: studentName.trim(),
        wallet_address: storedUser?.wallet_address,
        user_id: storedUser?.id,
      }
      const response = await fetch('http://127.0.0.1:5000/api/exam/join-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (data.success) {
        localStorage.setItem('exam_session', JSON.stringify({
          exam_code: examCode.toUpperCase(),
          student_name: studentName,
          exam_info: data.exam_info,
          joined_at: new Date().toISOString(),
        }))
        router.push('/coding/exam')
      } else {
        setError(data.error || 'Failed to join exam')
      }
    } catch {
      setError('Network error: Could not connect to backend server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-card-foreground">Join Coding Exam</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter the exam code provided by your instructor</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="exam-code">Exam Code</Label>
            <Input
              id="exam-code"
              value={examCode}
              onChange={e => setExamCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code"
              maxLength={6}
              className="text-center text-lg font-mono tracking-widest uppercase"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="student-name">Your Name</Label>
            <Input
              id="student-name"
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !examCode.trim() || !studentName.trim()}
            className="w-full gap-2"
            size="lg"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Joining Exam…' : 'Join Exam'}
          </Button>
        </form>
      </div>
    </div>
  )
}
