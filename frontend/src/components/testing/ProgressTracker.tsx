import React from 'react'

interface ProgressTrackerProps {
  current: number
  total: number
  score: number
  subject: string
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ 
  current, 
  total, 
  score, 
  subject 
}) => {
  const progressPercentage = (current / total) * 100

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {subject} - Adaptive Assessment
          </h2>
          <p className="text-sm text-gray-600">
            Question {current} of {total}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary-600">
            {score.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-600">Current Score</p>
        </div>
      </div>
      
      <div className="mb-2">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{Math.round(progressPercentage)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
      
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>🎯 Adaptive Difficulty</span>
        <span>⚡ Instant Feedback</span>
        <span>🏆 Blockchain Certified</span>
      </div>
    </div>
  )
}
