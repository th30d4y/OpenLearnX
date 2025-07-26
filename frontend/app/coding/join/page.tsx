'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function JoinExam() {
  const [examCode, setExamCode] = useState('')
  const [studentName, setStudentName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault() // ✅ Prevent form from reloading page
    
    setError('')
    
    if (!examCode.trim()) {
      setError('Please enter the exam code')
      return
    }
    
    if (!studentName.trim()) {
      setError('Please enter your name')
      return
    }

    setLoading(true)

    try {
      // ✅ CORRECT FIELD NAMES - Must match backend expectations
      const payload = {
        exam_code: examCode.trim().toUpperCase(),    // Backend expects exam_code
        student_name: studentName.trim()             // Backend expects student_name
      }
      
      console.log('🚀 Sending payload:', payload)

      const response = await fetch('http://127.0.0.1:5000/api/exam/join-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload) // ✅ MUST stringify the payload
      })

      console.log('📡 Response status:', response.status)
      
      const data = await response.json()
      console.log('📦 Response data:', data)
      
      if (data.success) {
        // Store session data
        localStorage.setItem('exam_session', JSON.stringify({
          exam_code: examCode.toUpperCase(),
          student_name: studentName,
          exam_info: data.exam_info,
          joined_at: new Date().toISOString()
        }))

        alert(`✅ Successfully joined: ${data.exam_info.title}

👤 Joined as: ${studentName}
📊 You are participant #${data.exam_info.participants_count}

Wait for the host to start the exam!`)

        // Redirect to exam interface
        router.push('/coding/exam')
        
      } else {
        setError(data.error || 'Failed to join exam')
      }
    } catch (error) {
      console.error('❌ Error:', error)
      setError('Network error: Could not connect to backend server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Coding Exam</h1>
          <p className="text-gray-600">Enter the exam code provided by your instructor</p>
        </div>

        {/* Form with proper onSubmit handler */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exam Code
            </label>
            <input
              type="text"
              value={examCode}
              onChange={(e) => setExamCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code"
              maxLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-widest uppercase"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !examCode.trim() || !studentName.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                Joining Exam...
              </div>
            ) : (
              'Join Exam'
            )}
          </button>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            ❌ {error}
          </div>
        )}

        {/* Debug Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs">
          <p className="text-gray-500 mb-1">Debug Info:</p>
          <p className="text-gray-400">Code: "{examCode}"</p>
          <p className="text-gray-400">Name: "{studentName}"</p>
          <p className="text-green-600 font-medium">✅ Sends: exam_code + student_name</p>
        </div>
      </div>
    </div>
  )
}
