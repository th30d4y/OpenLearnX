'use client'
import { useState } from 'react'

export default function JoinTestPage() {
  const [examCode, setExamCode] = useState('')
  const [studentName, setStudentName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    if (!examCode || !studentName) {
      alert('Fill both fields')
      return
    }

    setLoading(true)

    try {
      const payload = {
        exam_code: examCode.trim(),      // CORRECT field name
        student_name: studentName.trim() // CORRECT field name
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
        alert('✅ SUCCESS: ' + data.exam_info.title)
      } else {
        alert('❌ ERROR: ' + data.error)
      }
    } catch (error) {
      alert('❌ Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '50px', background: '#000', color: 'white', minHeight: '100vh' }}>
      <h1>🧪 TEST JOIN PAGE - BYPASS CACHE</h1>
      
      <div style={{ maxWidth: '400px', marginTop: '30px' }}>
        <input
          value={examCode}
          onChange={e => setExamCode(e.target.value)}
          placeholder="6884F82A7300F2AD9CFC974A"
          style={{ 
            width: '100%', 
            padding: '10px', 
            margin: '10px 0',
            background: '#333', 
            color: 'white',
            fontFamily: 'monospace'
          }}
        />
        
        <input
          value={studentName}
          onChange={e => setStudentName(e.target.value)}
          placeholder="Your name"
          style={{ 
            width: '100%', 
            padding: '10px', 
            margin: '10px 0',
            background: '#333', 
            color: 'white'
          }}
        />
        
        <button
          onClick={handleJoin}
          disabled={loading}
          style={{ 
            width: '100%',
            padding: '15px', 
            background: loading ? '#666' : '#00ff00', 
            color: 'black', 
            border: 'none',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'JOINING...' : 'TEST JOIN'}
        </button>
      </div>
      
      <div style={{ marginTop: '20px', background: '#333', padding: '10px' }}>
        <p>Will send: exam_code="{examCode}" student_name="{studentName}"</p>
      </div>
    </div>
  )
}
