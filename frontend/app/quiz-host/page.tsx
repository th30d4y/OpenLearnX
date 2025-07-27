'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Trash2, Play, Square, Settings, Brain, Crown, Target } from 'lucide-react'

interface Question {
  question_id: string
  question_text: string
  options: string[]
  correct_answer: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  explanation: string
}

interface Participant {
  session_id: string
  username: string
  score: number
  current_difficulty: string
  total_questions: number
  correct_answers: number
  status: string
}

interface QuizRoom {
  room_id: string
  room_code: string
  title: string
  host_name: string
  is_private: boolean
  status: string
  questions: Question[]
  participants: Participant[]
  max_participants: number
  duration_minutes: number
  participants_count?: number
  questions_count?: number
  questions_by_difficulty?: {
    easy: number
    medium: number
    hard: number
  }
}

export default function QuizHostPanel() {
  const router = useRouter()
  const [currentRoom, setCurrentRoom] = useState<QuizRoom | null>(null)
  const [activeTab, setActiveTab] = useState<'setup' | 'questions' | 'participants' | 'live'>('setup')
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [showAIGenerate, setShowAIGenerate] = useState(false)

  // Room creation form
  const [roomForm, setRoomForm] = useState({
    host_name: '',
    room_title: '',
    is_private: false,
    max_participants: 50,
    duration_minutes: 30
  })

  // Question form
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    points: 10,
    explanation: ''
  })

  // AI generation form
  const [aiForm, setAiForm] = useState({
    topic: '',
    num_easy: 3,
    num_medium: 3,
    num_hard: 2
  })

  const createRoom = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/quizzes/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomForm)
      })

      const data = await response.json()
      console.log('Room creation response:', data) // Debug log

      if (data.success) {
        // Ensure the room has all required properties
        const room = {
          ...data.room,
          status: data.room.status || 'waiting',
          participants: data.room.participants || [],
          questions: data.room.questions || []
        }
        console.log('Room object:', room) // Debug log
        setCurrentRoom(room)
        setShowCreateRoom(false)
        setActiveTab('questions')
        alert(`🎉 Room created! Code: ${room.room_code}`)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Room creation error:', error)
      alert('Network error: Could not create room')
    }
  }

  const addQuestion = async () => {
    if (!currentRoom) return

    if (!questionForm.question_text || questionForm.options.some(opt => !opt.trim()) || !questionForm.correct_answer) {
      alert('Please fill all question fields')
      return
    }

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/room/${currentRoom.room_code}/add-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionForm)
      })

      const data = await response.json()

      if (data.success) {
        // Refresh room data
        fetchRoomData()
        setShowAddQuestion(false)
        setQuestionForm({
          question_text: '',
          options: ['', '', '', ''],
          correct_answer: '',
          difficulty: 'medium',
          points: 10,
          explanation: ''
        })
        alert('✅ Question added successfully!')
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Network error: Could not add question')
    }
  }

  const generateAIQuestions = async () => {
    if (!currentRoom) return

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/room/${currentRoom.room_code}/generate-ai-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiForm)
      })

      const data = await response.json()

      if (data.success) {
        fetchRoomData()
        setShowAIGenerate(false)
        alert(`🤖 Generated ${data.questions.length} AI questions!`)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Network error: Could not generate questions')
    }
  }

  const removeQuestion = async (questionId: string) => {
    if (!currentRoom || !confirm('Remove this question?')) return

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/room/${currentRoom.room_code}/remove-question/${questionId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        fetchRoomData()
        alert('✅ Question removed')
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Network error: Could not remove question')
    }
  }

  const removeParticipant = async (username: string) => {
    if (!currentRoom || !confirm(`Remove ${username} from the quiz?`)) return

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/room/${currentRoom.room_code}/remove-participant/${username}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        fetchRoomData()
        alert(`✅ Removed ${username}`)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Network error: Could not remove participant')
    }
  }

  const startQuiz = async () => {
    if (!currentRoom) return

    if (currentRoom.questions.length === 0) {
      alert('Add questions before starting the quiz!')
      return
    }

    if (!confirm('Start the quiz now? Participants will begin answering questions.')) return

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/room/${currentRoom.room_code}/start`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        fetchRoomData()
        setActiveTab('live')
        alert('🚀 Quiz started!')
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Network error: Could not start quiz')
    }
  }

  const endQuiz = async () => {
    if (!currentRoom || !confirm('End the quiz now?')) return

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/room/${currentRoom.room_code}/end`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        fetchRoomData()
        alert('✅ Quiz ended!')
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Network error: Could not end quiz')
    }
  }

  const fetchRoomData = async () => {
    if (!currentRoom) return

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/quizzes/room/${currentRoom.room_code}/info`)
      const data = await response.json()

      if (data.success) {
        setCurrentRoom(data.room)
      }
    } catch (error) {
      console.error('Failed to fetch room data:', error)
    }
  }

  // Poll for live updates when quiz is active
  useEffect(() => {
    if (currentRoom?.status === 'active') {
      const interval = setInterval(fetchRoomData, 3000)
      return () => clearInterval(interval)
    }
  }, [currentRoom?.status])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-900'
      case 'medium': return 'text-yellow-400 bg-yellow-900'
      case 'hard': return 'text-red-400 bg-red-900'
      default: return 'text-gray-400 bg-gray-700'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'text-yellow-400 bg-yellow-900'
      case 'active': return 'text-green-400 bg-green-900'
      case 'completed': return 'text-gray-400 bg-gray-700'
      default: return 'text-gray-400 bg-gray-700'
    }
  }

  // Safe status getter
  const roomStatus = currentRoom?.status || 'waiting'

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center mb-8">
            <Crown className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">👑 Quiz Host Panel</h1>
            <p className="text-gray-400">
              Create and manage adaptive quizzes with AI-powered questions
            </p>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Create New Quiz Room</h2>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Your name (Host)"
                value={roomForm.host_name}
                onChange={(e) => setRoomForm(prev => ({...prev, host_name: e.target.value}))}
                className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              
              <input
                type="text"
                placeholder="Quiz room title"
                value={roomForm.room_title}
                onChange={(e) => setRoomForm(prev => ({...prev, room_title: e.target.value}))}
                className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={roomForm.is_private}
                      onChange={(e) => setRoomForm(prev => ({...prev, is_private: e.target.checked}))}
                      className="rounded"
                    />
                    <span>Private Room (requires code)</span>
                  </label>
                </div>
                
                <input
                  type="number"
                  placeholder="Max participants"
                  value={roomForm.max_participants}
                  onChange={(e) => setRoomForm(prev => ({...prev, max_participants: parseInt(e.target.value) || 50}))}
                  className="p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  min="1"
                  max="100"
                />
                
                <input
                  type="number"
                  placeholder="Duration (minutes)"
                  value={roomForm.duration_minutes}
                  onChange={(e) => setRoomForm(prev => ({...prev, duration_minutes: parseInt(e.target.value) || 30}))}
                  className="p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  min="5"
                  max="180"
                />
              </div>

              <button
                onClick={createRoom}
                disabled={!roomForm.host_name || !roomForm.room_title}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 p-4 rounded-lg font-semibold"
              >
                🚀 Create Quiz Room
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold flex items-center space-x-2">
                <Crown className="h-6 w-6 text-yellow-400" />
                <span>{currentRoom.title}</span>
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                <span>Code: <span className="font-bold text-blue-400">{currentRoom.room_code}</span></span>
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(roomStatus)}`}>
                  {roomStatus.toUpperCase()}
                </span>
                <span>👥 {currentRoom.participants?.length || 0}/{currentRoom.max_participants}</span>
                <span>❓ {currentRoom.questions?.length || 0} questions</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {roomStatus === 'waiting' && (
                <button
                  onClick={startQuiz}
                  disabled={(currentRoom.questions?.length || 0) === 0}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded flex items-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>Start Quiz</span>
                </button>
              )}
              
              {roomStatus === 'active' && (
                <button
                  onClick={endQuiz}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded flex items-center space-x-2"
                >
                  <Square className="h-4 w-4" />
                  <span>End Quiz</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          {[
            { id: 'questions', label: `Questions (${currentRoom.questions?.length || 0})`, icon: Target },
            { id: 'participants', label: `Participants (${currentRoom.participants?.length || 0})`, icon: Users },
            { id: 'live', label: 'Live View', icon: Play }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded flex items-center space-x-2 ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">📝 Question Management</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowAIGenerate(true)}
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded flex items-center space-x-2"
                >
                  <Brain className="h-4 w-4" />
                  <span>🤖 AI Generate</span>
                </button>
                <button
                  onClick={() => setShowAddQuestion(true)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Question</span>
                </button>
              </div>
            </div>

            {/* Questions by Difficulty */}
            {['easy', 'medium', 'hard'].map(difficulty => {
              const difficultyQuestions = (currentRoom.questions || []).filter(q => q.difficulty === difficulty)
              return (
                <div key={difficulty} className="mb-6">
                  <h3 className={`text-lg font-semibold mb-3 px-3 py-1 rounded inline-block ${getDifficultyColor(difficulty)}`}>
                    {difficulty.toUpperCase()} ({difficultyQuestions.length} questions)
                  </h3>
                  
                  <div className="space-y-3">
                    {difficultyQuestions.map((question, index) => (
                      <div key={question.question_id} className="bg-gray-800 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold mb-2">{question.question_text}</h4>
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
                            onClick={() => removeQuestion(question.question_id)}
                            disabled={roomStatus !== 'waiting'}
                            className="text-red-400 hover:text-red-300 disabled:text-gray-600 ml-4"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {difficultyQuestions.length === 0 && (
                      <div className="text-center py-4 text-gray-500 border-2 border-dashed border-gray-700 rounded-lg">
                        No {difficulty} questions yet
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Add Question Modal */}
            {showAddQuestion && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-bold mb-4">➕ Add New Question</h3>
                  
                  <div className="space-y-4">
                    <textarea
                      placeholder="Question text"
                      value={questionForm.question_text}
                      onChange={(e) => setQuestionForm(prev => ({...prev, question_text: e.target.value}))}
                      className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                      rows={3}
                    />

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Options:</label>
                      {questionForm.options.map((option, index) => (
                        <input
                          key={index}
                          type="text"
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...questionForm.options]
                            newOptions[index] = e.target.value
                            setQuestionForm(prev => ({...prev, options: newOptions}))
                          }}
                          className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <input
                        type="text"
                        placeholder="Correct answer"
                        value={questionForm.correct_answer}
                        onChange={(e) => setQuestionForm(prev => ({...prev, correct_answer: e.target.value}))}
                        className="p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      
                      <select
                        value={questionForm.difficulty}
                        onChange={(e) => setQuestionForm(prev => ({...prev, difficulty: e.target.value as any}))}
                        className="p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="easy">🟢 Easy</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="hard">🔴 Hard</option>
                      </select>
                      
                      <input
                        type="number"
                        placeholder="Points"
                        value={questionForm.points}
                        onChange={(e) => setQuestionForm(prev => ({...prev, points: parseInt(e.target.value) || 10}))}
                        className="p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        min="1"
                      />
                    </div>

                    <textarea
                      placeholder="Explanation (optional)"
                      value={questionForm.explanation}
                      onChange={(e) => setQuestionForm(prev => ({...prev, explanation: e.target.value}))}
                      className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="flex space-x-4 mt-6">
                    <button
                      onClick={addQuestion}
                      className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-semibold"
                    >
                      ✅ Add Question
                    </button>
                    <button
                      onClick={() => setShowAddQuestion(false)}
                      className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Generate Modal */}
            {showAIGenerate && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
                  <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-purple-400" />
                    <span>🤖 AI Question Generator</span>
                  </h3>
                  
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Topic (e.g., Programming, Science)"
                      value={aiForm.topic}
                      onChange={(e) => setAiForm(prev => ({...prev, topic: e.target.value}))}
                      className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">🟢 Easy</label>
                        <input
                          type="number"
                          value={aiForm.num_easy}
                          onChange={(e) => setAiForm(prev => ({...prev, num_easy: parseInt(e.target.value) || 0}))}
                          className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          min="0"
                          max="10"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">🟡 Medium</label>
                        <input
                          type="number"
                          value={aiForm.num_medium}
                          onChange={(e) => setAiForm(prev => ({...prev, num_medium: parseInt(e.target.value) || 0}))}
                          className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          min="0"
                          max="10"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">🔴 Hard</label>
                        <input
                          type="number"
                          value={aiForm.num_hard}
                          onChange={(e) => setAiForm(prev => ({...prev, num_hard: parseInt(e.target.value) || 0}))}
                          className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          min="0"
                          max="10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4 mt-6">
                    <button
                      onClick={generateAIQuestions}
                      disabled={aiForm.num_easy + aiForm.num_medium + aiForm.num_hard === 0}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-6 py-2 rounded font-semibold"
                    >
                      🚀 Generate
                    </button>
                    <button
                      onClick={() => setShowAIGenerate(false)}
                      className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Participants Tab */}
        {activeTab === 'participants' && (
          <div>
            <h2 className="text-xl font-bold mb-6">👥 Participant Management</h2>
            
            {(currentRoom.participants?.length || 0) === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl mb-2">No participants yet</p>
                <p>Share room code: <span className="font-bold text-blue-400">{currentRoom.room_code}</span></p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(currentRoom.participants || []).map((participant) => (
                  <div key={participant.session_id} className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{participant.username}</h3>
                        <div className="text-sm text-gray-400">
                          Score: {participant.score} pts
                        </div>
                      </div>
                      <button
                        onClick={() => removeParticipant(participant.username)}
                        disabled={roomStatus === 'active'}
                        className="text-red-400 hover:text-red-300 disabled:text-gray-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Difficulty:</span>
                        <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(participant.current_difficulty)}`}>
                          {participant.current_difficulty}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Progress:</span>
                        <span>{participant.correct_answers}/{participant.total_questions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Accuracy:</span>
                        <span>
                          {participant.total_questions > 0 
                            ? Math.round((participant.correct_answers / participant.total_questions) * 100)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live View Tab */}
        {activeTab === 'live' && (
          <div>
            <h2 className="text-xl font-bold mb-6">📺 Live Quiz Dashboard</h2>
            
            {roomStatus !== 'active' ? (
              <div className="text-center py-12 text-gray-400">
                <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl mb-2">Quiz not active</p>
                <p>Start the quiz to see live updates</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Real-time Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-400">{currentRoom.participants?.length || 0}</div>
                    <div className="text-sm text-gray-400">Active Participants</div>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {Math.round((currentRoom.participants || []).reduce((sum, p) => sum + (p.total_questions > 0 ? (p.correct_answers / p.total_questions) * 100 : 0), 0) / Math.max((currentRoom.participants || []).length, 1))}%
                    </div>
                    <div className="text-sm text-gray-400">Avg Accuracy</div>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {Math.max(...(currentRoom.participants || []).map(p => p.score), 0)}
                    </div>
                    <div className="text-sm text-gray-400">Top Score</div>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      {(currentRoom.participants || []).filter(p => p.current_difficulty === 'hard').length}
                    </div>
                    <div className="text-sm text-gray-400">Hard Level</div>
                  </div>
                </div>

                {/* Leaderboard */}
                <div className="bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-bold mb-4">🏆 Live Leaderboard</h3>
                  <div className="space-y-2">
                    {(currentRoom.participants || [])
                      .sort((a, b) => b.score - a.score)
                      .map((participant, index) => (
                        <div key={participant.session_id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                          <div className="flex items-center space-x-3">
                            <span className="font-bold text-yellow-400">#{index + 1}</span>
                            <span className="font-semibold">{participant.username}</span>
                            <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(participant.current_difficulty)}`}>
                              {participant.current_difficulty}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{participant.score} pts</div>
                            <div className="text-sm text-gray-400">
                              {participant.correct_answers}/{participant.total_questions} correct
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
