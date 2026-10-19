'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Code, Users, Clock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ExamLandingPage() {
  const router = useRouter()
  const [examCode, setExamCode] = useState('')

  const joinExam = () => {
    if (examCode.trim()) router.push(`/coding/exam/${examCode.trim().toUpperCase()}`)
    else alert('Please enter a valid exam code')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-card-foreground">Coding Exams</h1>
          <p className="text-sm text-muted-foreground">Join a coding exam with your exam code</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-8 space-y-8">
        <div className="rounded-xl border border-border bg-card p-8">
          <div className="text-center mb-8">
            <Code className="h-12 w-12 text-primary mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-card-foreground mb-1">Join Coding Exam</h2>
            <p className="text-muted-foreground text-sm">Enter your 6-character exam code to start</p>
          </div>
          <div className="max-w-sm mx-auto flex gap-3">
            <Input
              value={examCode}
              onChange={e => setExamCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && joinExam()}
              placeholder="Exam code (e.g. ABC123)"
              className="text-center text-lg font-mono tracking-widest uppercase flex-1"
              maxLength={6}
            />
            <Button onClick={joinExam} className="gap-2">
              Join <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Users, color: 'text-emerald-500', title: 'Multi-User', desc: 'Compete with other students in real-time coding challenges' },
            { icon: Clock, color: 'text-amber-500', title: 'Timed Exams', desc: 'Complete coding problems within the allocated time limit' },
            { icon: Code, color: 'text-primary', title: 'Multi-Language', desc: 'Code in Python, Java, JavaScript, C++, and more' },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6 text-center space-y-2">
              <Icon className={`h-10 w-10 ${color} mx-auto`} />
              <h3 className="font-semibold text-card-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <h3 className="font-semibold text-card-foreground">How to join an exam</h3>
          <div className="space-y-2">
            {[
              'Get your 6-character exam code from your instructor',
              'Enter the exam code in the field above and click "Join"',
              'Wait for the instructor to start the exam',
              'Code your solution and submit before time runs out',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-sm text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
