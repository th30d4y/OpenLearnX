import React, { useState, useEffect } from 'react'
import { testingService } from '../../services/api'
import { QuestionCard } from './QuestionCard'
import { InstantFeedback } from './InstantFeedback'
import { ProgressTracker } from './ProgressTracker'
import toast from 'react-hot-toast'

interface Question {
  id: string
  question: string
  options: string[]
  difficulty: number
  subject: string
}

interface FeedbackData {
  correct: boolean
  confidence_score: number
  explanation: string
  correct_answer: string
  current_score: number
  total_answered: number
}

export const AdaptiveTest: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>('')
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [feedback, setFeedback] = useState<FeedbackData | null>(null)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [totalQuestions] = useState(10)
  const [isLoading, setIsLoading] = useState(false)
  const [testCompleted, setTestCompleted] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState('Mathematics')

  const subjects = ['Mathematics', 'Geography', 'Literature', 'Science']

  const startTest = async () => {
    setIsLoading(true)
    setTestCompleted(false)
    setQuestionNumber(1)
    setFeedback(null)
    
    try {
      const data = await testingService.startTest(selectedSubject)
      setSessionId(data.session_id)
      setCurrentQuestion(data.question)
      toast.success('Test started! Good luck!')
    } catch (error) {
      console.error('Failed to start test:', error)
      toast.error('Failed to start test. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const submitAnswer = async (answerIndex: number) => {
    if (!currentQuestion || !sessionId) return

    setIsLoading(true)
    try {
      const data = await testingService.submitAnswer(sessionId, currentQuestion.id, answerIndex)
      setFeedback(data.feedback)

      // Show feedback, then proceed
      setTimeout(() => {
        if (data.test_completed) {
          setTestCompleted(true)
          toast.success('Test completed! Check your results.')
        } else if (data.next_question) {
          setCurrentQuestion(data.next_question)
          setQuestionNumber(prev => prev + 1)
          setFeedback(null)
        }
      }, 3000)

    } catch (error) {
      console.error('Failed to submit answer:', error)
      toast.error('Failed to submit answer. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!sessionId && !isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            OpenLearnX Adaptive Test
          </h2>
          <p className="text-gray-600 mb-6">
            Experience personalized learning with our adaptive testing system that adjusts to your performance in real-time.
          </p>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="block w-full max-w-xs mx-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={startTest}
            disabled={isLoading}
            className="btn-primary disabled:opacity-50"
          >
            {isLoading ? 'Starting Test...' : 'Start Adaptive Test'}
          </button>
        </div>
      </div>
    )
  }

  if (testCompleted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-green-600 mb-4">Test Completed!</h2>
          <p className="text-gray-600 mb-6">
            Congratulations! You've completed the adaptive test. Your performance has been analyzed and saved.
          </p>
          <div className="space-y-4">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="btn-primary mr-4"
            >
              View Detailed Results
            </button>
            <button
              onClick={() => setSessionId('')}
              className="btn-secondary"
            >
              Take Another Test
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <ProgressTracker 
        current={questionNumber} 
        total={totalQuestions}
        score={feedback?.current_score || 0}
        subject={selectedSubject}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div>
          {currentQuestion && (
            <QuestionCard
              question={currentQuestion}
              onAnswer={submitAnswer}
              isLoading={isLoading}
              questionNumber={questionNumber}
            />
          )}
        </div>
        
        <div>
          {feedback ? (
            <InstantFeedback feedback={feedback} />
          ) : (
            <div className="card">
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-4">🤔</div>
                <p>Select your answer to receive instant feedback with detailed explanations!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
