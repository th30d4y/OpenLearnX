import React, { useState } from 'react'

interface Question {
  id: string
  question: string
  options: string[]
  difficulty: number
  subject: string
}

interface QuestionCardProps {
  question: Question
  onAnswer: (answerIndex: number) => void
  isLoading: boolean
  questionNumber: number
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ 
  question, 
  onAnswer, 
  isLoading, 
  questionNumber 
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)

  const handleSubmit = () => {
    if (selectedAnswer !== null) {
      onAnswer(selectedAnswer)
      setSelectedAnswer(null)
    }
  }

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'text-green-600 bg-green-100'
    if (difficulty <= 3) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 2) return 'Easy'
    if (difficulty <= 3) return 'Medium'
    return 'Hard'
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Question {questionNumber}
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">{question.subject}</span>
          <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(question.difficulty)}`}>
            {getDifficultyLabel(question.difficulty)}
          </span>
        </div>
      </div>
      
      <div className="mb-6">
        <p className="text-lg text-gray-800 leading-relaxed">
          {question.question}
        </p>
      </div>
      
      <div className="space-y-3 mb-6">
        {question.options.map((option, index) => (
          <label
            key={index}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
              selectedAnswer === index 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-200'
            }`}
          >
            <input
              type="radio"
              name="answer"
              value={index}
              checked={selectedAnswer === index}
              onChange={() => setSelectedAnswer(index)}
              className="mr-3 text-primary-600 focus:ring-primary-500"
              disabled={isLoading}
            />
            <span className="text-gray-800">{option}</span>
          </label>
        ))}
      </div>
      
      <button
        onClick={handleSubmit}
        disabled={selectedAnswer === null || isLoading}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Processing Answer...
          </div>
        ) : (
          'Submit Answer'
        )}
      </button>
    </div>
  )
}
