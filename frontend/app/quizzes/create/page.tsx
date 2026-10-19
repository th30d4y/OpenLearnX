'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Question {
  question_text: string
  options: string[]
  correct_answer: string
  points: number
}

export default function CreateQuizPage() {
  const router = useRouter()
  const [quiz, setQuiz] = useState({ title: '', description: '', difficulty: 'medium' })
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '',
    points: 10,
  })
  const [loading, setLoading] = useState(false)

  const addQuestion = () => {
    if (!currentQuestion.question_text || currentQuestion.options.some(o => !o.trim()) || !currentQuestion.correct_answer) {
      alert('Please fill all question fields')
      return
    }
    setQuestions([...questions, { ...currentQuestion }])
    setCurrentQuestion({ question_text: '', options: ['', '', '', ''], correct_answer: '', points: 10 })
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const createQuiz = async () => {
    if (!quiz.title || questions.length === 0) {
      alert('Please add a title and at least one question')
      return
    }
    setLoading(true)
    try {
      const quizData = {
        ...quiz,
        questions: questions.map((q, index) => ({ ...q, id: `q_${index}`, question_number: index + 1 })),
        total_points: questions.reduce((sum, q) => sum + q.points, 0),
        created_at: new Date().toISOString(),
        generated_by: 'manual',
      }
      const response = await fetch('http://127.0.0.1:5000/api/quizzes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData),
      })
      const data = await response.json()
      if (data.success) router.push('/quizzes')
      else alert(`Error: ${data.error}`)
    } catch {
      alert('Network error: Could not create quiz')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/quizzes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Create New Quiz</h1>
        </div>

        {/* Quiz details */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-card-foreground">Quiz Information</h2>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="quiz-title">Title</Label>
              <Input
                id="quiz-title"
                placeholder="Quiz title"
                value={quiz.title}
                onChange={e => setQuiz(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quiz-desc">Description</Label>
              <textarea
                id="quiz-desc"
                placeholder="Quiz description"
                value={quiz.description}
                onChange={e => setQuiz(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="difficulty">Difficulty</Label>
              <select
                id="difficulty"
                value={quiz.difficulty}
                onChange={e => setQuiz(prev => ({ ...prev, difficulty: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </div>

        {/* Add question */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-card-foreground">Add Question</h2>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Question Text</Label>
              <textarea
                placeholder="Question text"
                value={currentQuestion.question_text}
                onChange={e => setCurrentQuestion(prev => ({ ...prev, question_text: e.target.value }))}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <Label>Options</Label>
              {currentQuestion.options.map((option, index) => (
                <Input
                  key={index}
                  placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  value={option}
                  onChange={e => {
                    const newOptions = [...currentQuestion.options]
                    newOptions[index] = e.target.value
                    setCurrentQuestion(prev => ({ ...prev, options: newOptions }))
                  }}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="correct-ans">Correct Answer</Label>
                <Input
                  id="correct-ans"
                  placeholder="Correct answer"
                  value={currentQuestion.correct_answer}
                  onChange={e => setCurrentQuestion(prev => ({ ...prev, correct_answer: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="points">Points</Label>
                <Input
                  id="points"
                  type="number"
                  min="1"
                  placeholder="Points"
                  value={currentQuestion.points}
                  onChange={e => setCurrentQuestion(prev => ({ ...prev, points: parseInt(e.target.value) || 10 }))}
                />
              </div>
            </div>
            <Button variant="outline" onClick={addQuestion} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          </div>
        </div>

        {/* Question list */}
        {questions.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold text-card-foreground">Questions ({questions.length})</h2>
            <div className="space-y-3">
              {questions.map((q, index) => (
                <div key={index} className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground mb-2">Q{index + 1}: {q.question_text}</p>
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground mb-2">
                        {q.options.map((opt, i) => (
                          <span key={i} className={opt === q.correct_answer ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                            {String.fromCharCode(65 + i)}) {opt}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Points: {q.points}</p>
                    </div>
                    <button onClick={() => removeQuestion(index)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={createQuiz}
          disabled={loading || !quiz.title || questions.length === 0}
          className="w-full gap-2"
          size="lg"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {loading ? 'Creating…' : 'Create Quiz'}
        </Button>
      </div>
    </div>
  )
}
