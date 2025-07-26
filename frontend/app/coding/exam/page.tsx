'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Code, Users, Clock, ArrowRight } from 'lucide-react'

export default function ExamLandingPage() {
  const router = useRouter()
  const [examCode, setExamCode] = useState('')

  const joinExam = () => {
    if (examCode.trim()) {
      router.push(`/coding/exam/${examCode.trim().toUpperCase()}`)
    } else {
      alert('Please enter a valid exam code')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      joinExam()
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold">OpenLearnX Coding Exams</h1>
          <p className="text-gray-400">Join a coding exam with your exam code</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-8">
        {/* Join Exam Section */}
        <div className="bg-gray-800 rounded-lg p-8 mb-8">
          <div className="text-center mb-8">
            <Code className="h-16 w-16 text-blue-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">Join Coding Exam</h2>
            <p className="text-gray-400">Enter your 6-character exam code to start</p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="flex space-x-4">
              <input
                type="text"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="Enter exam code (e.g. ABC123)"
                className="flex-1 p-4 bg-gray-700 border border-gray-600 rounded-lg text-center text-xl font-mono tracking-widest"
                maxLength={6}
              />
              <button
                onClick={joinExam}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-4 rounded-lg flex items-center space-x-2"
              >
                <span>Join</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <Users className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Multi-User</h3>
            <p className="text-gray-400">Compete with other students in real-time coding challenges</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <Clock className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Timed Exams</h3>
            <p className="text-gray-400">Complete coding problems within the allocated time limit</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <Code className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Multi-Language</h3>
            <p className="text-gray-400">Code in Python, Java, JavaScript, C++, and more</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">How to Join an Exam</h3>
          <div className="space-y-3 text-gray-300">
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
              <p>Get your 6-character exam code from your instructor</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
              <p>Enter the exam code in the field above and click "Join"</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
              <p>Wait for the instructor to start the exam</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
              <p>Code your solution and submit before time runs out</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
