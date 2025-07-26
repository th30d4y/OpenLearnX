'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateExam() {
  const [examData, setExamData] = useState({
    title: 'String Capitalizer Challenge',
    host_name: '',
    duration_minutes: 30,
    max_participants: 50,
    problem_id: 'string-capitalizer'
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleInputChange = (field: string, value: any) => {
    setExamData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
  }

  const createExam = async () => {
    // Clear previous messages
    setError('')
    setResult('')

    // Validation
    if (!examData.title.trim()) {
      setError('Please enter exam title')
      return
    }

    if (!examData.host_name.trim()) {
      setError('Please enter host name')
      return
    }

    setLoading(true)
    setResult('⏳ Creating exam...')

    try {
      const payload = {
        title: examData.title.trim(),
        problem_id: examData.problem_id,
        duration_minutes: examData.duration_minutes,
        host_name: examData.host_name.trim(),
        max_participants: examData.max_participants
      }

      console.log('📤 Sending payload:', payload)

      const response = await fetch('http://127.0.0.1:5000/api/exam/create-exam', {
        method: 'POST',         
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      console.log('📡 Response status:', response.status)
      
      const data = await response.json()
      console.log('📦 Full backend response:', data)

      if (data.success) {
        // ✅ ENHANCED DEBUGGING - Log all fields
        console.log('🔍 All response fields:', Object.keys(data))
        console.log('📝 exam_code field:', data.exam_code)
        console.log('🗄️ exam_id field:', data.exam_id)
        console.log('📋 exam_details:', data.exam_details)

        // ✅ CORRECTED: Use exam_code, NOT exam_id
        const participantCode = data.exam_code  // This should be "JEX99M"
        const databaseId = data.exam_id         // This is the MongoDB ObjectId
        
        console.log('📝 Participant Code (CORRECT for sharing):', participantCode)
        console.log('🗄️ Database ID (internal only):', databaseId)

        // ✅ ENHANCED: Check if exam_code exists
        if (!participantCode) {
          console.error('❌ ERROR: exam_code is missing from response!')
          setError('Backend did not return exam_code. Check backend logs.')
          return
        }

        // ✅ SIMPLIFIED SUCCESS MESSAGE - Easier to spot issues
        const simpleAlert = `Exam created! Share this code with participants: ${participantCode}`
        
        // ✅ DETAILED SUCCESS MESSAGE for result display
        const successMessage = `🎉 EXAM CREATED SUCCESSFULLY!

📝 EXAM CODE FOR PARTICIPANTS:
┌─────────────────┐
│     ${participantCode}      │
└─────────────────┘

📋 Exam Details:
• Title: ${data.exam_details?.title || examData.title}
• Duration: ${data.exam_details?.duration || examData.duration_minutes} minutes
• Max Participants: ${data.exam_details?.max_participants || examData.max_participants}
• Host: ${examData.host_name}
• Languages: ${data.exam_details?.languages?.join(', ') || 'Python'}

🔗 Share this code with participants: ${participantCode}
📱 Join URL: localhost:3000/coding/join

⚠️ IMPORTANT: Give participants "${participantCode}", 
   NOT the database ID "${databaseId}"!

✅ Participants will use: ${participantCode}`

        setResult(successMessage)

        // ✅ SIMPLE ALERT - This should show the correct code
        alert(simpleAlert)

        // ✅ ADDITIONAL PROMINENT ALERT
        setTimeout(() => {
          alert(`✅ EXAM CODE: ${participantCode}

Share this 6-character code with participants.
They will enter: ${participantCode}`)
        }, 500)

        // Store the correct exam code for host dashboard
        localStorage.setItem('created_exam', JSON.stringify({
          exam_code: participantCode,  // 6-character code for participants
          exam_id: databaseId,         // Internal database ID
          exam_details: data.exam_details,
          host_name: examData.host_name,
          created_at: new Date().toISOString()
        }))

        // Redirect to host dashboard after 5 seconds (increased time)
        setTimeout(() => {
          router.push(`/coding/host/${participantCode}`)
        }, 5000)

      } else {
        setError(data.error || 'Failed to create exam')
        setResult('')
      }
    } catch (error) {
      console.error('❌ Network error:', error)
      setError('Network error: Could not connect to backend server')
      setResult('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Coding Exam</h1>
          <p className="text-gray-600">Set up a new coding challenge for participants</p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exam Title
            </label>
            <input
              type="text"
              value={examData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter exam title"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Host/Instructor Name
            </label>
            <input
              type="text"
              value={examData.host_name}
              onChange={(e) => handleInputChange('host_name', e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={examData.duration_minutes}
                onChange={(e) => handleInputChange('duration_minutes', parseInt(e.target.value) || 30)}
                min="5"
                max="180"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Participants
              </label>
              <input
                type="number"
                value={examData.max_participants}
                onChange={(e) => handleInputChange('max_participants', parseInt(e.target.value) || 50)}
                min="1"
                max="200"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={createExam}
            disabled={loading || !examData.title.trim() || !examData.host_name.trim()}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                Creating Exam...
              </div>
            ) : (
              <>
                <svg className="inline h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                Create Exam
              </>
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start">
            <svg className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Success Result Display */}
        {result && (
          <div className="mt-6 p-6 bg-green-50 border border-green-200 text-green-700 rounded-lg whitespace-pre-line text-sm">
            {result}
          </div>
        )}

        {/* Enhanced Debug Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs">
          <p className="text-gray-500 mb-2">Debug Info:</p>
          <p className="text-gray-400">Title: "{examData.title}"</p>
          <p className="text-gray-400">Host: "{examData.host_name}"</p>
          <p className="text-gray-400">Duration: {examData.duration_minutes} minutes</p>
          <p className="text-green-600 font-medium">✅ Will show exam_code (6 chars), NOT exam_id</p>
          <p className="text-blue-600 font-medium">🔍 Check browser console for detailed logs</p>
        </div>

        {/* Features Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Exam Features:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
            <div className="flex items-center">
              <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Real-time participant tracking
            </div>
            <div className="flex items-center">
              <svg className="h-4 w-4 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Live leaderboard
            </div>
            <div className="flex items-center">
              <svg className="h-4 w-4 text-purple-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m18 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Multi-language support
            </div>
            <div className="flex items-center">
              <svg className="h-4 w-4 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Timed exam sessions
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
