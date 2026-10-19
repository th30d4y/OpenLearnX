'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
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

  const canAddQuestion =
    !!currentQuestion.question_text &&
    currentQuestion.options.every(o => o.trim()) &&
    !!currentQuestion.correct_answer

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/quizzes')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-semibold text-foreground tracking-tight">Create Quiz</h1>
            {questions.length > 0 && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/quizzes')}>Cancel</Button>
            <Button
              onClick={createQuiz}
              disabled={loading || !quiz.title || questions.length === 0}
              size="sm"
              className="gap-1.5"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {loading ? 'Saving…' : 'Save Quiz'}
            </Button>
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left: Quiz details */}
          <div className="lg:w-72 shrink-0 space-y-5">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-card-foreground tracking-tight">Quiz details</h2>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="quiz-title">Title</Label>
                  <Input
                    id="quiz-title"
                    placeholder="e.g. Python Fundamentals"
                    value={quiz.title}
                    onChange={e => setQuiz(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quiz-desc">Description</Label>
                  <textarea
                    id="quiz-desc"
                    placeholder="Brief description of the quiz"
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

            {/* Summary */}
            {questions.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <h2 className="text-sm font-semibold text-card-foreground tracking-tight">Summary</h2>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Questions</span>
                  <span className="font-medium text-foreground">{questions.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total points</span>
                  <span className="font-medium text-foreground">{questions.reduce((s, q) => s + q.points, 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Questions */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground tracking-tight">Questions</h2>
            </div>

            {/* Add question form */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="text-sm font-medium text-card-foreground">
                {questions.length === 0 ? 'Add your first question' : `Question ${questions.length + 1}`}
              </h3>

              <div className="space-y-1.5">
                <Label>Question text</Label>
                <textarea
                  placeholder="What does this question ask?"
                  value={currentQuestion.question_text}
                  onChange={e => setCurrentQuestion(prev => ({ ...prev, question_text: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <Label>Answer options — click an option to mark it correct</Label>
                {currentQuestion.options.map((option, index) => {
                  const letter = String.fromCharCode(65 + index)
                  const isCorrect = option.trim() !== '' && option === currentQuestion.correct_answer
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => option.trim() && setCurrentQuestion(prev => ({ ...prev, correct_answer: option }))}
                        className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center text-xs font-bold transition-colors ${
                          isCorrect
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                        title="Mark as correct"
                      >
                        {isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : letter}
                      </button>
                      <Input
                        placeholder={`Option ${letter}`}
                        value={option}
                        onChange={e => {
                          const newOptions = [...currentQuestion.options]
                          const oldVal = newOptions[index]
                          newOptions[index] = e.target.value
                          setCurrentQuestion(prev => ({
                            ...prev,
                            options: newOptions,
                            correct_answer: prev.correct_answer === oldVal ? e.target.value : prev.correct_answer,
                          }))
                        }}
                        className={isCorrect ? 'border-primary bg-primary/5' : ''}
                      />
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-3">
                <div className="space-y-1.5 w-24">
                  <Label htmlFor="points">Points</Label>
                  <Input
                    id="points"
                    type="number"
                    min="1"
                    value={currentQuestion.points}
                    onChange={e => setCurrentQuestion(prev => ({ ...prev, points: parseInt(e.target.value) || 10 }))}
                  />
                </div>
                <div className="flex-1 flex justify-end pt-5">
                  <Button
                    variant="outline"
                    onClick={addQuestion}
                    disabled={!canAddQuestion}
                    className="gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    Add Question
                  </Button>
                </div>
              </div>
            </div>

            {/* Added questions list */}
            {questions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground tracking-tight">Added questions</h3>
                {questions.map((q, index) => (
                  <div key={index} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                        Q{index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-card-foreground leading-snug">{q.question_text}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                          {q.options.map((opt, i) => (
                            <span
                              key={i}
                              className={`text-xs ${opt === q.correct_answer ? 'text-primary font-medium' : 'text-muted-foreground'}`}
                            >
                              {String.fromCharCode(65 + i)}) {opt}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{q.points} pts</p>
                      </div>
                      <button
                        onClick={() => removeQuestion(index)}
                        className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                        aria-label="Remove question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
