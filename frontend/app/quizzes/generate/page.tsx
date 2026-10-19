'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Sparkles, Settings, Clock, Trophy, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AIQuizGenerator() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ topic: '', difficulty: 'medium', num_questions: 5 })
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('http://127.0.0.1:5000/api/quizzes/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (data.success) router.push(`/quizzes/${data.quiz.id}`)
      else setError(data.error || 'Failed to generate quiz')
    } catch {
      setError('Network error: Could not generate quiz')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Brain className="h-10 w-10 text-primary" />
            <Sparkles className="h-7 w-7 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">AI Quiz Generator</h1>
          <p className="text-muted-foreground text-sm">Generate intelligent quizzes using our trained CNN model</p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <h2 className="font-semibold text-card-foreground flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Quiz Configuration
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="topic">Topic / Subject</Label>
              <Input
                id="topic"
                value={formData.topic}
                onChange={e => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                placeholder="e.g., Science, History, Technology"
                required
              />
              <p className="text-xs text-muted-foreground">AI will generate questions related to this topic</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <select
                id="difficulty"
                value={formData.difficulty}
                onChange={e => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Number of Questions</Label>
                <span className="text-sm font-bold text-foreground">{formData.num_questions}</span>
              </div>
              <input
                type="range"
                min="3"
                max="20"
                value={formData.num_questions}
                onChange={e => setFormData(prev => ({ ...prev, num_questions: parseInt(e.target.value) }))}
                className="w-full accent-primary"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full gap-2" size="lg">
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating Quiz…</>
                : <><Brain className="h-4 w-4" /> Generate AI Quiz</>}
            </Button>
          </form>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Brain, color: 'text-primary', title: 'AI-Powered', desc: 'Uses trained CNN model for intelligent question selection' },
            { icon: Clock, color: 'text-blue-500', title: 'Instant Generation', desc: 'Generate quizzes in seconds with AI processing' },
            { icon: Trophy, color: 'text-amber-500', title: 'Smart Feedback', desc: 'AI provides intelligent feedback on answers' },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-4 text-center space-y-2">
              <Icon className={`h-7 w-7 ${color} mx-auto`} />
              <p className="font-semibold text-card-foreground text-sm">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
