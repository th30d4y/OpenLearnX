'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, Eye, RefreshCw } from 'lucide-react'

interface Course {
  id: string
  title: string
  subject: string
  description: string
  difficulty: string
  mentor: string
  video_url: string
  students: number
  status: 'published' | 'draft'
  created_at: string
}

export default function AdminDashboard() {
  const [isClient, setIsClient] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [stats, setStats] = useState({
    total_courses: 0,
    total_lessons: 0,
    active_students: 0,
    completion_rate: 0
  })
  const router = useRouter()

  // Enhanced authentication with API verification to prevent redirect loops
  useEffect(() => {
    setIsClient(true)
    
    const checkAuth = async () => {
      try {
        // Add delay to prevent race conditions
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const token = localStorage.getItem('admin_token')
        console.log('Dashboard - checking token:', token)
        
        if (!token) {
          console.log('Dashboard - no token found')
          router.push('/admin/login')
          return
        }
        
        if (token === 'admin-secret-key') {
          console.log('Dashboard - token format valid, verifying with API...')
          
          try {
            const response = await fetch('http://127.0.0.1:5000/api/admin/courses', {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            
            if (response.ok) {
              console.log('✅ Dashboard - API confirms token valid')
              setIsAuthenticated(true)
              fetchData()
            } else {
              console.log('❌ Dashboard - API rejects token')
              localStorage.removeItem('admin_token')
              router.push('/admin/login')
            }
          } catch (apiError) {
            console.error('Dashboard - API check failed:', apiError)
            // Don't redirect on API error, might be temporary network issue
            setIsAuthenticated(true)
            fetchData()
          }
        } else {
          console.log('Dashboard - invalid token format')
          localStorage.removeItem('admin_token')
          router.push('/admin/login')
        }
      } catch (error) {
        console.error('Dashboard - auth check error:', error)
        router.push('/admin/login')
      } finally {
        setAuthChecked(true)
      }
    }
    
    checkAuth()
  }, [router])

  const fetchData = async () => {
    await Promise.all([fetchCourses(), fetchStats()])
  }

  const fetchCourses = async () => {
    try {
      console.log('Fetching courses...')
      
      const response = await fetch('http://127.0.0.1:5000/api/admin/courses', {
        headers: { 
          'Authorization': 'Bearer admin-secret-key',
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Received data:', data)
      
      if (Array.isArray(data)) {
        setCourses(data)
        console.log('✅ Courses set successfully:', data.length, 'courses')
      } else {
        console.error('❌ API returned non-array data:', data)
        setCourses([])
      }
    } catch (error) {
      console.error('❌ Error fetching courses:', error)
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/admin/dashboard', {
        headers: { 'Authorization': 'Bearer admin-secret-key' }
      })
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleCreateCourse = async (formData: any) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/admin/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-secret-key'
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        await fetchData()
        setShowAddForm(false)
        alert('Course created successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating course:', error)
      alert('Failed to create course')
    }
  }

  const handleUpdateCourse = async (courseId: string, formData: any) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/admin/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-secret-key'
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        await fetchData()
        setEditingCourse(null)
        alert('Course updated successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating course:', error)
      alert('Failed to update course')
    }
  }

  const handleDeleteCourse = async (courseId: string) => {
    if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        const response = await fetch(`http://127.0.0.1:5000/api/admin/courses/${courseId}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer admin-secret-key' }
        })
        
        if (response.ok) {
          await fetchData()
          alert('Course deleted successfully!')
        } else {
          const error = await response.json()
          alert(`Error: ${error.error}`)
        }
      } catch (error) {
        console.error('Error deleting course:', error)
        alert('Failed to delete course')
      }
    }
  }

  const initializeDefaultCourses = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/admin/initialize', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer admin-secret-key' }
      })
      
      if (response.ok) {
        await fetchData()
        alert('Default courses initialized!')
      }
    } catch (error) {
      console.error('Error initializing courses:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    router.push('/')
  }

  // Show loading until auth is checked
  if (!isClient || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Show redirect message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">OL</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">OpenLearnX Admin Panel</h1>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                DYNAMIC
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchData}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                title="Refresh Data"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <span className="text-gray-600">Welcome, 5t4l1n! 👋</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Action Buttons */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Course Management</h2>
              <p className="text-gray-600">Add, edit, or remove courses dynamically</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={initializeDefaultCourses}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <span>Initialize Default Courses</span>
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Course</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Courses</h3>
              <p className="text-2xl font-bold text-blue-600">{stats.total_courses}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Active Students</h3>
              <p className="text-2xl font-bold text-green-600">{stats.active_students}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Lessons</h3>
              <p className="text-2xl font-bold text-purple-600">{stats.total_lessons}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
              <p className="text-2xl font-bold text-orange-600">{stats.completion_rate}%</p>
            </div>
          </div>

          {/* Course Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">All Courses</h3>
            </div>
            
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading courses...</p>
              </div>
            ) : !Array.isArray(courses) || courses.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">No courses found. Initialize default courses or add a new one.</p>
                <button
                  onClick={initializeDefaultCourses}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Initialize Default Courses
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mentor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Students
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {courses.map((course) => (
                      <tr key={course.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {course.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {course.subject} • {course.difficulty}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {course.mentor}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {course.students?.toLocaleString() || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => window.open(`/courses/${course.id}`, '_blank')}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Course"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => setEditingCourse(course)}
                              className="text-green-600 hover:text-green-900"
                              title="Edit Course"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteCourse(course.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Course"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Course Modal */}
      {showAddForm && (
        <CourseFormModal
          title="Add New Course"
          onClose={() => setShowAddForm(false)}
          onSubmit={handleCreateCourse}
        />
      )}

      {/* Edit Course Modal */}
      {editingCourse && (
        <CourseFormModal
          title="Edit Course"
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onSubmit={(data) => handleUpdateCourse(editingCourse.id, data)}
        />
      )}
    </div>
  )
}

// Course Form Modal Component
function CourseFormModal({ 
  title, 
  course, 
  onClose, 
  onSubmit 
}: { 
  title: string
  course?: Course
  onClose: () => void
  onSubmit: (data: any) => void 
}) {
  const [formData, setFormData] = useState({
    title: course?.title || '',
    subject: course?.subject || 'Programming',
    description: course?.description || '',
    difficulty: course?.difficulty || 'Beginner',
    mentor: course?.mentor || '5t4l1n',
    video_url: course?.video_url || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const getEmbedUrl = (videoUrl: string) => {
    if (!videoUrl) return null
    
    let videoId = ''
    if (videoUrl.includes('youtu.be/')) {
      videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0]
    } else if (videoUrl.includes('youtube.com/watch?v=')) {
      videoId = videoUrl.split('v=')[1]?.split('&')[0]
    } else if (videoUrl.includes('youtube.com/embed/')) {
      return videoUrl
    }
    
    return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1` : null
  }

  return (
    <React.Fragment>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4 max-h-screen overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Advanced React Development"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Programming">Programming</option>
                  <option value="Cybersecurity">Cybersecurity</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Mobile Development">Mobile Development</option>
                  <option value="DevOps">DevOps</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty *
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                  <option value="Beginner to Advanced">Beginner to Advanced</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mentor *
              </label>
              <input
                type="text"
                required
                value={formData.mentor}
                onChange={(e) => setFormData({...formData, mentor: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Instructor name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Course description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                YouTube Video URL
              </label>
              <input
                type="url"
                value={formData.video_url}
                onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://youtu.be/..."
              />
            </div>

            {/* Video Preview */}
            {formData.video_url && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Preview
                </label>
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <iframe
                    src={getEmbedUrl(formData.video_url) || ''}
                    title="Video Preview"
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {course ? 'Update Course' : 'Create Course'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </React.Fragment>
  )
}
