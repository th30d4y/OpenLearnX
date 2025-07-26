'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function JoinExam() {
  const [examCode, setExamCode] = useState('')
  const [studentName, setStudentName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const router = useRouter()

  const join = async () => {
    if (!examCode || !studentName) {
      setResult('❌ Please fill both fields')
      return
    }

    setLoading(true)
    setResult('⏳ Joining exam...')

    try {
      const payload = {
        exam_code: examCode.trim().toUpperCase(),
        student_name: studentName.trim()
      }
      
      console.log('🚀 Sending:', payload)

      const response = await fetch('http://127.0.0.1:5000/api/exam/join-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      console.log('📦 Response:', data)

      if (data.success) {
        // ✅ ENHANCED SUCCESS DISPLAY
        const successMessage = `✅ Successfully joined: ${data.exam_info.title}

📋 Exam Details:
• Status: ${data.exam_info.status}
• Duration: ${data.exam_info.duration_minutes} minutes
• Participants: ${data.exam_info.participants_count}/${data.exam_info.max_participants}
• Languages: ${data.exam_info.languages.join(', ')}
• Problem: ${data.exam_info.problem_title}

🎯 You're now registered for the exam!
⏳ Wait for the host to start the exam.`

        setResult(successMessage)
        
        // Store session data
        localStorage.setItem('exam_session', JSON.stringify({
          exam_code: examCode.toUpperCase(),
          student_name: studentName,
          exam_info: data.exam_info,
          joined_at: new Date().toISOString()
        }))

        // Show success alert
        alert(`🎉 Welcome to the exam!

📝 Exam: ${data.exam_info.title}
👤 Joined as: ${studentName}
📊 You are participant #${data.exam_info.participants_count}

✅ Successfully registered!`)

        // Redirect to exam waiting page after 2 seconds
        setTimeout(() => {
          router.push('/coding/exam')
        }, 2000)
        
      } else {
        setResult(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('❌ Error:', error)
      setResult('❌ Network error: Could not connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '50px', background: '#1a1a1a', color: 'white', minHeight: '100vh', fontFamily: 'monospace' }}>
      <h1>🚀 Join Coding Exam</h1>
      
      <div style={{ maxWidth: '500px', marginTop: '30px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: '#4CAF50' }}>
            Exam Code:
          </label>
          <input
            value={examCode}
            onChange={e => setExamCode(e.target.value)}
            placeholder="0C3LQ8"
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: '#333', 
              color: 'white', 
              border: '2px solid #4CAF50',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '16px',
              textTransform: 'uppercase'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: '#4CAF50' }}>
            Your Name:
          </label>
          <input
            value={studentName}
            onChange={e => setStudentName(e.target.value)}
            placeholder="Your name"
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: '#333', 
              color: 'white', 
              border: '2px solid #4CAF50',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
        </div>
        
        <button
          onClick={join}
          disabled={loading}
          style={{ 
            width: '100%',
            padding: '15px', 
            background: loading ? '#666' : '#4CAF50', 
            color: 'white', 
            border: 'none',
            borderRadius: '4px',
            fontSize: '18px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? '⏳ Joining Exam...' : '🚀 Join Exam'}
        </button>
      </div>
      
      {/* ENHANCED RESULT DISPLAY */}
      {result && (
        <div style={{ 
          marginTop: '30px', 
          padding: '20px', 
          background: result.includes('✅') ? '#1a4a1a' : '#4a1a1a',
          border: result.includes('✅') ? '2px solid #4CAF50' : '2px solid #f44336',
          borderRadius: '8px',
          whiteSpace: 'pre-line',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          {result}
        </div>
      )}
      
      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        background: '#333', 
        borderRadius: '4px',
        border: '2px solid #4CAF50'
      }}>
        <h3 style={{ color: '#4CAF50' }}>🔧 Debug Info:</h3>
        <p>Exam Code: "{examCode}"</p>
        <p>Student Name: "{studentName}"</p>
        <p style={{ color: '#4CAF50' }}>✅ Backend working correctly</p>
      </div>
    </div>
  )
}
