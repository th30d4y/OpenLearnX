import React from 'react'
import { CheckCircleIcon, XCircleIcon, LightBulbIcon } from '@heroicons/react/24/solid'

interface FeedbackProps {
  feedback: {
    correct: boolean
    confidence_score: number
    explanation: string
    correct_answer: string
    current_score: number
    total_answered: number
  }
}

export const InstantFeedback: React.FC<FeedbackProps> = ({ feedback }) => {
  const getConfidenceColor = (score: number) => {
    if (score > 0.7) return 'bg-green-500'
    if (score > 0.4) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getConfidenceLabel = (score: number) => {
    if (score > 0.8) return 'Very High'
    if (score > 0.6) return 'High'
    if (score > 0.4) return 'Medium'
    if (score > 0.2) return 'Low'
    return 'Very Low'
  }

  return (
    <div className="card">
      <div className="flex items-center mb-6">
        {feedback.correct ? (
          <CheckCircleIcon className="h-8 w-8 text-green-500 mr-3" />
        ) : (
          <XCircleIcon className="h-8 w-8 text-red-500 mr-3" />
        )}
        <div>
          <h3 className={`text-xl font-semibold ${feedback.correct ? 'text-green-700' : 'text-red-700'}`}>
            {feedback.correct ? 'Correct!' : 'Incorrect'}
          </h3>
          <p className="text-sm text-gray-600">
            Instant feedback powered by AI
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Confidence Score */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-700">AI Confidence Score</p>
            <span className="text-sm text-gray-500">
              {getConfidenceLabel(feedback.confidence_score)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${getConfidenceColor(feedback.confidence_score)}`}
              style={{ width: `${feedback.confidence_score * 100}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {Math.round(feedback.confidence_score * 100)}% confidence
          </p>
        </div>

        {/* Explanation */}
        <div>
          <div className="flex items-center mb-2">
            <LightBulbIcon className="h-5 w-5 text-yellow-500 mr-2" />
            <p className="text-sm font-medium text-gray-700">Explanation</p>
          </div>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <p className="text-gray-800">{feedback.explanation}</p>
          </div>
        </div>

        {/* Correct Answer (if incorrect) */}
        {!feedback.correct && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Correct Answer</p>
            <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded">
              <p className="text-green-800 font-medium">{feedback.correct_answer}</p>
            </div>
          </div>
        )}

        {/* Current Performance */}
        <div className="pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">
                {feedback.current_score.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Current Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-700">
                {feedback.total_answered}
              </p>
              <p className="text-sm text-gray-600">Questions Answered</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
