'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, Eye, RefreshCw, BookOpen, List, X } from 'lucide-react'

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

interface Module {
  id: string
  course_id: string
  title: string
  description: string
  order: number
  created_at?: string
}

interface Lesson {
  id: string
  module_id: string
  title: string
  description: string
  video_url: string
  order: number
  created_at?: string
}

export default function AdminDashboard() {
  const [isClient, setIsClient] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  
  // Module/Lesson Management State
  const [showModulesModal, setShowModulesModal] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [modulesLoading, setModulesLoading] = useState(false)
  const [lessonsLoading, setLessonsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  const [stats, setStats] = useState({
    total_courses: 0,
    total_lessons: 0,
    active_students: 0,
    completion_rate: 0
  })
  const router = useRouter()

  // Authentication logic
  useEffect(() => {
    setIsClient(true)
    
    const checkAuth = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const token = localStorage.getItem('admin_token')
        
        if (!token) {
          router.push('/admin/login')
          return
        }
        
        if (token === 'admin-secret-key') {
          try {
            const response = await fetch('http://127.0.0.1:5000/api/admin/courses', {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            
            if (response.ok) {
              setIsAuthenticated(true)
              fetchData()
            } else {
              localStorage.removeItem('admin_token')
              router.push('/admin/login')
            }
          } catch (apiError) {
            setIsAuthenticated(true)
            fetchData()
          }
        } else {
          localStorage.removeItem('admin_token')
          router.push('/admin/login')
        }
      } catch (error) {
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
      const response = await fetch('http://127.0.0.1:5000/api/admin/courses', {
        headers: { 
          'Authorization': 'Bearer admin-secret-key',
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (Array.isArray(data)) {
        setCourses(data)
      } else {
        setCourses([])
      }
    } catch (error) {
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
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      // Silent fail for stats
    }
  }

  // ✅ FIXED: Module fetching - the key fix here
  const fetchModules = async (courseId: string) => {
    setModulesLoading(true)
    setErrorMessage(null)
    
    try {
      console.log('🔍 Fetching modules for course:', courseId) // Debug log
      
      const response = await fetch(`http://127.0.0.1:5000/api/admin/courses/${courseId}/modules`, {
        headers: { 
          'Authorization': 'Bearer admin-secret-key',
          'Content-Type': 'application/json'
        }
      })
      
      console.log('🔍 Modules response status:', response.status) // Debug log
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Modules response data:', data) // Debug log
        
        // ✅ FIXED: Proper handling of modules response
        let modulesList: Module[] = []
        
        if (data.modules && Array.isArray(data.modules)) {
          modulesList = data.modules
        } else if (Array.isArray(data)) {
          modulesList = data
        } else if (data.success && data.data && Array.isArray(data.data)) {
          modulesList = data.data
        }
        
        console.log('🔍 Setting modules:', modulesList) // Debug log
        setModules(modulesList)
      } else {
        console.error('❌ Failed to fetch modules:', response.status)
        setModules([])
        setErrorMessage(`Failed to load modules: ${response.status}`)
      }
    } catch (error) {
      console.error('❌ Network error fetching modules:', error)
      setModules([])
      setErrorMessage('Network error loading modules')
    } finally {
      setModulesLoading(false)
    }
  }

  // ✅ FIXED: Lesson fetching - the key fix here
  const fetchLessons = async (moduleId: string) => {
    setLessonsLoading(true)
    setErrorMessage(null)
    
    try {
      console.log('🔍 Fetching lessons for module:', moduleId) // Debug log
      
      const response = await fetch(`http://127.0.0.1:5000/api/admin/modules/${moduleId}/lessons`, {
        headers: { 
          'Authorization': 'Bearer admin-secret-key',
          'Content-Type': 'application/json'
        }
      })
      
      console.log('🔍 Lessons response status:', response.status) // Debug log
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Lessons response data:', data) // Debug log
        
        // ✅ FIXED: Proper handling of lessons response
        let lessonsList: Lesson[] = []
        
        if (data.lessons && Array.isArray(data.lessons)) {
          lessonsList = data.lessons
        } else if (Array.isArray(data)) {
          lessonsList = data
        } else if (data.success && data.data && Array.isArray(data.data)) {
          lessonsList = data.data
        }
        
        console.log('🔍 Setting lessons:', lessonsList) // Debug log
        setLessons(lessonsList)
      } else {
        console.error('❌ Failed to fetch lessons:', response.status)
        setLessons([])
        setErrorMessage(`Failed to load lessons: ${response.status}`)
      }
    } catch (error) {
      console.error('❌ Network error fetching lessons:', error)
      setLessons([])
      setErrorMessage('Network error loading lessons')
    } finally {
      setLessonsLoading(false)
    }
  }

  // Course CRUD operations
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
        alert(`Error: ${error.error || 'Failed to create course'}`)
      }
    } catch (error) {
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
        alert('Failed to update course')
      }
    } catch (error) {
      alert('Failed to update course')
    }
  }

  const handleDeleteCourse = async (courseId: string) => {
    if (confirm('Are you sure you want to delete this course?')) {
      try {
        const response = await fetch(`http://127.0.0.1:5000/api/admin/courses/${courseId}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer admin-secret-key' }
        })
        
        if (response.ok) {
          await fetchData()
          alert('Course deleted successfully!')
        } else {
          alert('Failed to delete course')
        }
      } catch (error) {
        alert('Failed to delete course')
      }
    }
  }

  // Module/Lesson Management
  const openModulesManager = async (course: Course) => {
    console.log('🔍 Opening modules manager for course:', course.id)
    setSelectedCourse(course)
    setShowModulesModal(true)
    setModules([])
    setLessons([])
    setErrorMessage(null)
    await fetchModules(course.id)
  }

  const handleCreateModule = async (formData: any) => {
    try {
      console.log('🔍 Creating module with data:', formData)
      
      const response = await fetch(`http://127.0.0.1:5000/api/admin/courses/${selectedCourse?.id}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-secret-key'
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        await fetchModules(selectedCourse!.id)
        alert('Module created successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to create module'}`)
      }
    } catch (error) {
      alert('Failed to create module')
    }
  }

  const handleCreateLesson = async (moduleId: string, formData: any) => {
    try {
      console.log('🔍 Creating lesson for module:', moduleId, 'with data:', formData)
      
      const response = await fetch(`http://127.0.0.1:5000/api/admin/modules/${moduleId}/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-secret-key'
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        await fetchLessons(moduleId)
        alert('Lesson created successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to create lesson'}`)
      }
    } catch (error) {
      alert('Failed to create lesson')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    router.push('/')
  }

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
              <span className="text-gray-600">Welcome, Admin! 👋</span>
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
          {/* Error Display */}
          {errorMessage && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="absolute top-0 bottom-0 right-0 px-4 py-3"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Course Management</h2>
              <p className="text-gray-600">Manage courses, modules, and lessons</p>
            </div>
            <div className="flex space-x-3">
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
            ) : courses.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">No courses found.</p>
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
                            <button 
                              onClick={() => openModulesManager(course)}
                              className="text-purple-600 hover:text-purple-900"
                              title="Manage Modules & Lessons"
                            >
                              <BookOpen className="h-4 w-4" />
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

      {/* Course Form Modal */}
      {showAddForm && (
        <CourseFormModal
          title="Add New Course"
          onClose={() => setShowAddForm(false)}
          onSubmit={handleCreateCourse}
        />
      )}

      {editingCourse && (
        <CourseFormModal
          title="Edit Course"
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onSubmit={(data) => handleUpdateCourse(editingCourse.id, data)}
        />
      )}

      {/* ✅ FIXED: Modules & Lessons Modal */}
      {showModulesModal && selectedCourse && (
        <ModulesLessonsModal
          course={selectedCourse}
          modules={modules}
          lessons={lessons}
          modulesLoading={modulesLoading}
          lessonsLoading={lessonsLoading}
          onClose={() => {
            setShowModulesModal(false)
            setSelectedCourse(null)
            setModules([])
            setLessons([])
            setErrorMessage(null)
          }}
          onCreateModule={handleCreateModule}
          onCreateLesson={handleCreateLesson}
          onFetchLessons={fetchLessons}
          onRefreshModules={() => fetchModules(selectedCourse.id)}
        />
      )}
    </div>
  )
}

// ✅ FIXED: Enhanced Modules & Lessons Modal with better debugging
function ModulesLessonsModal({ 
  course, 
  modules, 
  lessons,
  modulesLoading,
  lessonsLoading,
  onClose, 
  onCreateModule,
  onCreateLesson,
  onFetchLessons,
  onRefreshModules
}: { 
  course: Course
  modules: Module[]
  lessons: Lesson[]
  modulesLoading: boolean
  lessonsLoading: boolean
  onClose: () => void
  onCreateModule: (data: any) => void
  onCreateLesson: (moduleId: string, data: any) => void
  onFetchLessons: (moduleId: string) => void
  onRefreshModules: () => void
}) {
  const [activeTab, setActiveTab] = useState<'modules' | 'lessons'>('modules')
  const [showModuleForm, setShowModuleForm] = useState(false)
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const [moduleFormData, setModuleFormData] = useState({ title: '', description: '', order: 1 })
  const [lessonFormData, setLessonFormData] = useState({ title: '', description: '', video_url: '', order: 1 })

  const handleModuleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreateModule(moduleFormData)
    setModuleFormData({ title: '', description: '', order: 1 })
    setShowModuleForm(false)
  }

  const handleLessonSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🔍 Creating lesson for module ID:', selectedModuleId) // Debug log
    console.log('🔍 Lesson form data:', lessonFormData) // Debug log
    if (selectedModuleId) {
      onCreateLesson(selectedModuleId, lessonFormData)
      setLessonFormData({ title: '', description: '', video_url: '', order: 1 })
      setShowLessonForm(false)
    }
  }

  // ✅ FIXED: Enhanced module selection with better debugging
  const handleSelectModule = (moduleId: string) => {
    console.log('🔍 Selecting module with ID:', moduleId) // Debug log
    console.log('🔍 Available modules:', modules) // Debug log
    setSelectedModuleId(moduleId)
    onFetchLessons(moduleId)
    setActiveTab('lessons')
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Manage: {course.title}
            </h3>
            <button
              onClick={onRefreshModules}
              className="p-1 text-gray-500 hover:text-gray-700 rounded"
              title="Refresh Modules"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`py-2 px-4 ${activeTab === 'modules' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('modules')}
            >
              Modules ({modules.length})
            </button>
            <button
              className={`py-2 px-4 ml-4 ${activeTab === 'lessons' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('lessons')}
            >
              Lessons ({lessons.length})
            </button>
          </div>

          {/* ✅ DEBUG INFO - Remove after fixing */}
          <div className="mb-4 p-3 bg-gray-100 rounded text-xs">
            <p><strong>Debug Info:</strong></p>
            <p>Selected Module ID: {selectedModuleId || 'None'}</p>
            <p>Modules Count: {modules.length}</p>
            <p>Lessons Count: {lessons.length}</p>
            <p>Active Tab: {activeTab}</p>
          </div>

          {/* Modules Tab */}
          {activeTab === 'modules' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold">Course Modules</h4>
                <button
                  onClick={() => setShowModuleForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Module</span>
                </button>
              </div>

              {modulesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading modules...</p>
                </div>
              ) : modules.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No modules found for this course.</p>
                  <p className="text-sm text-gray-400">Click "Add Module" to create your first module.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {modules.map((module, index) => (
                    <div key={module.id || index} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-900">{module.title}</h5>
                          <p className="text-gray-600 text-sm mt-1">{module.description}</p>
                          <p className="text-xs text-gray-400 mt-1">Order: {module.order} | ID: {module.id}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSelectModule(module.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm p-1"
                            title="View Lessons"
                          >
                            <List className="w-4 h-4" />
                          </button>
                          <button 
                            className="text-green-600 hover:text-green-800 text-sm p-1"
                            title="Edit Module"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            className="text-red-600 hover:text-red-800 text-sm p-1"
                            title="Delete Module"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Module Form */}
              {showModuleForm && (
                <div className="mt-6 border-t pt-6">
                  <h5 className="font-semibold mb-4">Add New Module</h5>
                  <form onSubmit={handleModuleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Module Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={moduleFormData.title}
                        onChange={(e) => setModuleFormData({...moduleFormData, title: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Introduction to Python"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={moduleFormData.description}
                        onChange={(e) => setModuleFormData({...moduleFormData, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Module description..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Order
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={moduleFormData.order}
                        onChange={(e) => setModuleFormData({...moduleFormData, order: parseInt(e.target.value) || 1})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Create Module
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowModuleForm(false)}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Lessons Tab */}
          {activeTab === 'lessons' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold">
                  Lessons {selectedModuleId ? `(${modules.find(m => m.id === selectedModuleId)?.title})` : ''}
                </h4>
                <button
                  onClick={() => setShowLessonForm(true)}
                  disabled={!selectedModuleId}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Lesson</span>
                </button>
              </div>

              {!selectedModuleId ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Select a module from the Modules tab to view/add lessons</p>
                </div>
              ) : lessonsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading lessons...</p>
                </div>
              ) : lessons.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No lessons found for this module.</p>
                  <p className="text-sm text-gray-400">Click "Add Lesson" to create your first lesson.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lessons.map((lesson, index) => (
                    <div key={lesson.id || index} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-900">{lesson.title}</h5>
                          <p className="text-gray-600 text-sm mt-1">{lesson.description}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <p className="text-xs text-gray-400">Order: {lesson.order}</p>
                            <p className="text-xs text-gray-400">ID: {lesson.id}</p>
                            {lesson.video_url && (
                              <a 
                                href={lesson.video_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 text-xs hover:underline"
                              >
                                📹 Video Link
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            className="text-green-600 hover:text-green-800 text-sm p-1"
                            title="Edit Lesson"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            className="text-red-600 hover:text-red-800 text-sm p-1"
                            title="Delete Lesson"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Lesson Form */}
              {showLessonForm && selectedModuleId && (
                <div className="mt-6 border-t pt-6">
                  <h5 className="font-semibold mb-4">Add New Lesson</h5>
                  <form onSubmit={handleLessonSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lesson Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={lessonFormData.title}
                        onChange={(e) => setLessonFormData({...lessonFormData, title: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., Variables and Data Types"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={lessonFormData.description}
                        onChange={(e) => setLessonFormData({...lessonFormData, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        rows={3}
                        placeholder="Lesson description..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Video URL
                      </label>
                      <input
                        type="url"
                        value={lessonFormData.video_url}
                        onChange={(e) => setLessonFormData({...lessonFormData, video_url: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="https://youtu.be/..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Order
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={lessonFormData.order}
                        onChange={(e) => setLessonFormData({...lessonFormData, order: parseInt(e.target.value) || 1})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                      >
                        Create Lesson
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLessonForm(false)}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Course Form Modal (unchanged)
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
    mentor: course?.mentor || 'Admin',
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
  )
}
