'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react'

interface Question {
  question_text: string
  options: string[]
  correct_answer: string
  points: number
}

export default function CreateQuizPage() {
  const router = useRouter()
  const [quiz, setQuiz] = useState({
    title: '',
    description: '',
    difficulty: 'medium'
  })
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '',
    points: 10
  })
  const [loading, setLoading] = useState(false)

  const addQuestion = () => {
    if (!currentQuestion.question_text || currentQuestion.options.some(opt => !opt.trim()) || !currentQuestion.correct_answer) {
      alert('Please fill all question fields')
      return
    }

    setQuestions([...questions, { ...currentQuestion }])
    setCurrentQuestion({
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: '',
      points: 10
    })
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
        questions: questions.map((q, index) => ({
          ...q,
          id: `q_${index}`,
          question_number: index + 1
        })),
        total_points: questions.reduce((sum, q) => sum + q.points, 0),
        created_at: new Date().toISOString(),
        generated_by: 'manual'
      }

      const response = await fetch('http://127.0.0.1:5000/api/quizzes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData)
      })

      const data = await response.json()

      if (data.success) {
        alert('✅ Quiz created successfully!')
        router.push('/quizzes')
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Network error: Could not create quiz')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => router.push('/quizzes')}
            className="bg-gray-700 hover:bg-gray-600 p-2 rounded"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-3xl font-bold">📝 Create New Quiz</h1>
        </div>

        {/* Quiz Details */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Quiz Information</h2>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Quiz title"
              value={quiz.title}
              onChange={(e) => setQuiz(prev => ({...prev, title: e.target.value}))}
              className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            
            <textarea
              placeholder="Quiz description"
              value={quiz.description}
              onChange={(e) => setQuiz(prev => ({...prev, description: e.target.value}))}
              className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              rows={3}
            />
            
            <select
              value={quiz.difficulty}
              onChange={(e) => setQuiz(prev => ({...prev, difficulty: e.target.value}))}
              className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="easy">🟢 Easy</option>
              <option value="medium">🟡 Medium</option>
              <option value="hard">🔴 Hard</option>
            </select>
          </div>
        </div>

        {/* Add Question */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Add Question</h2>
          
          <div className="space-y-4">
            <textarea
              placeholder="Question text"
              value={currentQuestion.question_text}
              onChange={(e) => setCurrentQuestion(prev => ({...prev, question_text: e.target.value}))}
              className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              rows={3}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Options:</label>
              {currentQuestion.options.map((option, index) => (
                <input
                  key={index}
                  type="text"
                  placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...currentQuestion.options]
                    newOptions[index] = e.target.value
                    setCurrentQuestion(prev => ({...prev, options: newOptions}))
                  }}
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Correct answer"
                value={currentQuestion.correct_answer}
                onChange={(e) => setCurrentQuestion(prev => ({...prev, correct_answer: e.target.value}))}
                className="p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              
              <input
                type="number"
                placeholder="Points"
                value={currentQuestion.points}
                onChange={(e) => setCurrentQuestion(prev => ({...prev, points: parseInt(e.target.value) || 10}))}
                className="p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                min="1"
              />
            </div>

            <button
              onClick={addQuestion}
              className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-semibold flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Question</span>
            </button>
          </div>
        </div>

        {/* Questions List */}
        {questions.length > 0 && (
          <div className="bg-gray-800 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-bold mb-4">Questions ({questions.length})</h2>
            
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={index} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Q{index + 1}: {question.question_text}</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-400 mb-2">
                        {question.options.map((option, optIndex) => (
                          <span key={optIndex} className={`${option === question.correct_answer ? 'text-green-400 font-semibold' : ''}`}>
                            {String.fromCharCode(65 + optIndex)}) {option}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500">
                        Points: {question.points} | Correct: {question.correct_answer}
                      </div>
                    </div>
                    <button
                      onClick={() => removeQuestion(index)}
                      className="text-red-400 hover:text-red-300 ml-4"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Button */}
        <div className="text-center">
          <button
            onClick={createQuiz}
            disabled={loading || !quiz.title || questions.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-8 py-3 rounded-lg font-semibold flex items-center space-x-2 mx-auto"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Create Quiz</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
