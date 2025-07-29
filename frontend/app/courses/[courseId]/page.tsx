"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Loader2, Play, Clock, BookOpen, ChevronDown, ChevronRight, User, Users, Star } from "lucide-react"
import { toast } from "react-hot-toast"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { CertificateModal } from "@/components/certificate-modal"

type Course = {
  id: string
  title: string
  description: string
  subject: string
  difficulty: string
  mentor: string
  students: number
  embed_url?: string
  video_url?: string
}

type Module = {
  id: string
  course_id: string
  title: string
  description: string
  order: number
  created_at?: string
}

type Lesson = {
  id: string
  module_id: string
  course_id: string
  title: string
  description: string
  video_url: string
  embed_url: string
  order: number
  duration?: string
  type: string
  content?: string
}

export default function CoursePage() {
  const { user, firebaseUser, isLoading: authLoading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const courseId = params?.courseId as string

  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [lessons, setLessons] = useState<{ [moduleId: string]: Lesson[] }>({})
  const [loading, setLoading] = useState(true)
  const [modulesLoading, setModulesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Navigation state
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [expandedModules, setExpandedModules] = useState<{ [moduleId: string]: boolean }>({})
  const [completed, setCompleted] = useState(false)
  
  // ✅ Certificate Modal State
  const [showCertificateModal, setShowCertificateModal] = useState(false)

  useEffect(() => {
    if (!authLoading && !user && !firebaseUser) {
      toast.error("Please login to view courses.")
      router.replace("/")
      return
    }
    if ((user || firebaseUser) && courseId) {
      fetchCourseData()
    }
  }, [authLoading, user, firebaseUser, courseId, router])

  const fetchCourseData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Starting to fetch course data for:', courseId)
      
      // Fetch course details
      const courseResponse = await api.get<Course>(`/api/courses/${courseId}?t=${Date.now()}`)
      const courseData = courseResponse.data
      console.log('✅ Course data loaded:', courseData)
      setCourse(courseData)

      // ✅ FIXED: Better module fetching with multiple endpoint attempts
      await fetchModulesAndLessons(courseId)
      
    } catch (err: any) {
      console.error('❌ Error fetching course data:', err)
      setError(err.message || "Failed to load course data.")
      toast.error("Failed to load course data.")
    } finally {
      setLoading(false)
    }
  }

  const fetchModulesAndLessons = async (courseId: string) => {
    setModulesLoading(true)
    
    try {
      console.log('🔍 Fetching modules for course:', courseId)
      
      // Try multiple endpoints for modules
      let modulesData = null
      let modulesResponse = null
      
      // Try admin endpoint first (most likely to work based on previous conversation)
      try {
        modulesResponse = await fetch(`http://127.0.0.1:5000/api/admin/courses/${courseId}/modules`, {
          headers: {
            'Authorization': 'Bearer admin-secret-key',
            'Content-Type': 'application/json'
          }
        })
        
        if (modulesResponse.ok) {
          modulesData = await modulesResponse.json()
          console.log('✅ Modules loaded from admin endpoint:', modulesData)
        }
      } catch (adminError) {
        console.log('⚠️ Admin endpoint failed, trying public endpoint')
      }
      
      // If admin endpoint failed, try public endpoint
      if (!modulesData || !modulesResponse?.ok) {
        try {
          modulesResponse = await fetch(`http://127.0.0.1:5000/api/courses/${courseId}/modules`, {
            headers: {
              'Content-Type': 'application/json'
            }
          })
          
          if (modulesResponse.ok) {
            modulesData = await modulesResponse.json()
            console.log('✅ Modules loaded from public endpoint:', modulesData)
          }
        } catch (publicError) {
          console.error('❌ Both module endpoints failed')
        }
      }
      
      if (modulesData) {
        let modulesList: Module[] = []
        
        // Handle different response formats
        if (modulesData.success && modulesData.modules && Array.isArray(modulesData.modules)) {
          modulesList = modulesData.modules
        } else if (modulesData.modules && Array.isArray(modulesData.modules)) {
          modulesList = modulesData.modules
        } else if (Array.isArray(modulesData)) {
          modulesList = modulesData
        } else if (modulesData.data && Array.isArray(modulesData.data)) {
          modulesList = modulesData.data
        }
        
        // Sort modules by order
        modulesList = modulesList.sort((a, b) => a.order - b.order)
        
        console.log('🔍 Processed modules list:', modulesList)
        setModules(modulesList)
        
        // Fetch lessons for all modules
        if (modulesList.length > 0) {
          await fetchLessonsForAllModules(modulesList)
        }
      } else {
        console.log('⚠️ No modules data received')
        setModules([])
        setLessons({})
      }
      
    } catch (error) {
      console.error('❌ Error in fetchModulesAndLessons:', error)
      setModules([])
      setLessons({})
    } finally {
      setModulesLoading(false)
    }
  }

  const fetchLessonsForAllModules = async (modulesList: Module[]) => {
    const lessonsData: { [moduleId: string]: Lesson[] } = {}
    const expandedState: { [moduleId: string]: boolean } = {}
    
    for (const module of modulesList) {
      try {
        console.log('🔍 Fetching lessons for module:', module.id)
        
        // Try admin endpoint first
        let lessonsResponse = await fetch(`http://127.0.0.1:5000/api/admin/modules/${module.id}/lessons`, {
          headers: {
            'Authorization': 'Bearer admin-secret-key',
            'Content-Type': 'application/json'
          }
        })
        
        // If admin fails, try public endpoint
        if (!lessonsResponse.ok) {
          lessonsResponse = await fetch(`http://127.0.0.1:5000/api/modules/${module.id}/lessons`, {
            headers: {
              'Content-Type': 'application/json'
            }
          })
        }
        
        if (lessonsResponse.ok) {
          const lessonData = await lessonsResponse.json()
          console.log(`✅ Lessons loaded for module ${module.id}:`, lessonData)
          
          let lessonsList: Lesson[] = []
          if (lessonData.success && lessonData.lessons && Array.isArray(lessonData.lessons)) {
            lessonsList = lessonData.lessons
          } else if (lessonData.lessons && Array.isArray(lessonData.lessons)) {
            lessonsList = lessonData.lessons
          } else if (Array.isArray(lessonData)) {
            lessonsList = lessonData
          } else if (lessonData.data && Array.isArray(lessonData.data)) {
            lessonsList = lessonData.data
          }
          
          // Sort lessons by order
          lessonsList = lessonsList.sort((a, b) => a.order - b.order)
          lessonsData[module.id] = lessonsList
          
          // Auto-expand first module with lessons
          if (!selectedModuleId && lessonsList.length > 0) {
            expandedState[module.id] = true
          }
        } else {
          console.log(`⚠️ No lessons found for module ${module.id}`)
          lessonsData[module.id] = []
        }
      } catch (error) {
        console.error(`❌ Error fetching lessons for module ${module.id}:`, error)
        lessonsData[module.id] = []
      }
    }
    
    setLessons(lessonsData)
    setExpandedModules(expandedState)
    
    // Auto-select first lesson if available
    if (!selectedModuleId && modulesList.length > 0) {
      const firstModule = modulesList[0]
      const firstModuleLessons = lessonsData[firstModule.id] || []
      
      setSelectedModuleId(firstModule.id)
      if (firstModuleLessons.length > 0) {
        setSelectedLessonId(firstModuleLessons[0].id)
      }
    }
  }

  // Helper: embed URL
  function getEmbedUrl(url?: string): string | undefined {
    if (!url) return undefined
    const regExp = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^#&?]{11})/
    const match = url.match(regExp)
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`
    }
    return url
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }))
  }

  const selectLesson = (moduleId: string, lessonId: string) => {
    setSelectedModuleId(moduleId)
    setSelectedLessonId(lessonId)
    // Auto-expand the module when lesson is selected
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: true
    }))
  }

  const getCurrentLesson = (): Lesson | null => {
    if (!selectedModuleId || !selectedLessonId) return null
    const moduleLessons = lessons[selectedModuleId] || []
    return moduleLessons.find(lesson => lesson.id === selectedLessonId) || null
  }

  const getAllLessons = (): Lesson[] => {
    const allLessons: Lesson[] = []
    modules.forEach(module => {
      const moduleLessons = lessons[module.id] || []
      allLessons.push(...moduleLessons)
    })
    return allLessons
  }

  const navigateLesson = (direction: 'prev' | 'next') => {
    const allLessons = getAllLessons()
    const currentIndex = allLessons.findIndex(lesson => lesson.id === selectedLessonId)
    
    if (direction === 'prev' && currentIndex > 0) {
      const prevLesson = allLessons[currentIndex - 1]
      selectLesson(prevLesson.module_id, prevLesson.id)
    } else if (direction === 'next' && currentIndex < allLessons.length - 1) {
      const nextLesson = allLessons[currentIndex + 1]
      selectLesson(nextLesson.module_id, nextLesson.id)
    }
  }

  const isFirstLesson = () => {
    const allLessons = getAllLessons()
    return allLessons.length > 0 && allLessons[0].id === selectedLessonId
  }

  const isLastLesson = () => {
    const allLessons = getAllLessons()
    return allLessons.length > 0 && allLessons[allLessons.length - 1].id === selectedLessonId
  }

  // ✅ Updated markComplete function to show certificate modal
  const markComplete = () => {
    setCompleted(true)
    setShowCertificateModal(true) // Show certificate modal instead of just toast
  }

  const getTotalLessons = () => {
    return Object.values(lessons).reduce((total, moduleLessons) => total + moduleLessons.length, 0)
  }

  const currentLesson = getCurrentLesson()

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-lg text-gray-700">Loading course...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Course</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={fetchCourseData}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Course Not Found</h2>
          <p className="text-gray-600">The course you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">OL</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{course.title}</h1>
                <p className="text-sm text-gray-600">by {course.mentor}</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-sm">
              <div className="flex items-center text-gray-600">
                <BookOpen className="w-4 h-4 mr-2" />
                <span>{modules.length} modules</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Play className="w-4 h-4 mr-2" />
                <span>{getTotalLessons()} lessons</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Users className="w-4 h-4 mr-2" />
                <span>{course.students} students</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          
          {/* Sidebar */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Course Content</h2>
              
              {/* Debug Info - Enhanced */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">🔍 Debug Info:</h3>
                <div className="text-xs space-y-1 text-blue-700">
                  <p><strong>Course ID:</strong> {courseId}</p>
                  <p><strong>Modules Loaded:</strong> {modules.length}</p>
                  <p><strong>Total Lessons:</strong> {getTotalLessons()}</p>
                  <p><strong>Modules Loading:</strong> {modulesLoading ? 'Yes' : 'No'}</p>
                  <p><strong>Selected Module:</strong> {selectedModuleId || 'None'}</p>
                  <p><strong>Selected Lesson:</strong> {currentLesson?.title || 'None'}</p>
                  <p><strong>Expanded Modules:</strong> {Object.keys(expandedModules).length}</p>
                </div>
                {modules.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-blue-600">Show Raw Data</summary>
                    <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-32">
                      {JSON.stringify({ modules, lessons }, null, 2)}
                    </pre>
                  </details>
                )}
              </div>

              {/* Loading State */}
              {modulesLoading && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Loading modules...</p>
                </div>
              )}

              {/* No Modules State */}
              {!modulesLoading && modules.length === 0 && (
                <div className="text-center py-8">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-yellow-800 mb-2">No Modules Found</h3>
                    <p className="text-xs text-yellow-700 mb-3">
                      This could mean:
                    </p>
                    <ul className="text-xs text-yellow-700 text-left space-y-1">
                      <li>• No modules created for this course yet</li>
                      <li>• API endpoint issues</li>
                      <li>• Course ID mismatch</li>
                    </ul>
                    <button 
                      onClick={() => fetchModulesAndLessons(courseId)}
                      className="mt-3 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                    >
                      Retry Loading Modules
                    </button>
                  </div>
                </div>
              )}

              {/* Modules List */}
              {!modulesLoading && modules.length > 0 && (
                <div className="space-y-2">
                  {modules.map((module, index) => (
                    <div key={module.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Module Header */}
                      <button
                        onClick={() => toggleModule(module.id)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between transition-colors ${
                          selectedModuleId === module.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-800 rounded-full flex items-center justify-center text-xs font-semibold">
                              {index + 1}
                            </span>
                            <h3 className="font-medium text-sm text-gray-900 truncate">{module.title}</h3>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 ml-8">
                            {lessons[module.id]?.length || 0} lessons
                          </p>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                          {expandedModules[module.id] ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* Lessons */}
                      {expandedModules[module.id] && (
                        <div className="bg-gray-50 border-t border-gray-200">
                          {lessons[module.id] && lessons[module.id].length > 0 ? (
                            lessons[module.id].map((lesson, lessonIndex) => (
                              <button
                                key={lesson.id}
                                onClick={() => selectLesson(module.id, lesson.id)}
                                className={`w-full px-6 py-3 text-left hover:bg-gray-100 transition-colors border-l-4 ${
                                  selectedLessonId === lesson.id
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                                    : 'border-transparent text-gray-700'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                                    selectedLessonId === lesson.id
                                      ? 'bg-indigo-500 text-white'
                                      : 'bg-gray-300 text-gray-600'
                                  }`}>
                                    <Play className="w-2.5 h-2.5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{lesson.title}</p>
                                    {lesson.duration && (
                                      <p className={`text-xs flex items-center mt-1 ${
                                        selectedLessonId === lesson.id ? 'text-indigo-600' : 'text-gray-500'
                                      }`}>
                                        <Clock className="w-3 h-3 mr-1" />
                                        {lesson.duration}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-6 py-4 text-center">
                              <p className="text-xs text-gray-500">No lessons in this module</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="mt-8 lg:mt-0 lg:col-span-8 xl:col-span-9">
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {currentLesson ? (
                <>
                  {/* Video Player */}
                  {(currentLesson.embed_url || currentLesson.video_url) && (
                    <div className="aspect-video bg-black">
                      <iframe
                        src={getEmbedUrl(currentLesson.embed_url || currentLesson.video_url)}
                        title={currentLesson.title}
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                  )}

                  {/* Lesson Content */}
                  <div className="p-8">
                    {/* Lesson Header */}
                    <div className="mb-6">
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <User className="w-4 h-4 mr-1" />
                        <span>by {course.mentor}</span>
                        <span className="mx-2">•</span>
                        <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium">
                          {course.difficulty}
                        </span>
                      </div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentLesson.title}</h1>
                      {currentLesson.duration && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{currentLesson.duration}</span>
                        </div>
                      )}
                    </div>

                    {/* Lesson Description */}
                    {currentLesson.description && (
                      <div className="prose max-w-none mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">About this lesson</h2>
                        <div className="text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-lg">
                          {currentLesson.description}
                        </div>
                      </div>
                    )}

                    {/* Lesson Content */}
                    {currentLesson.content && (
                      <div className="prose max-w-none mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Lesson Content</h2>
                        <div className="text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-lg">
                          {currentLesson.content}
                        </div>
                      </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between items-center pt-8 border-t border-gray-200">
                      <button
                        onClick={() => navigateLesson('prev')}
                        disabled={isFirstLesson()}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        ← Previous Lesson
                      </button>
                      
                      {!isLastLesson() ? (
                        <button
                          onClick={() => navigateLesson('next')}
                          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                        >
                          Next Lesson →
                        </button>
                      ) : (
                        <button
                          onClick={markComplete}
                          disabled={completed}
                          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                            completed
                              ? "bg-green-600 text-white cursor-not-allowed"
                              : "bg-purple-600 text-white hover:bg-purple-700"
                          }`}
                        >
                          {completed ? "✓ Course Completed" : "Mark as Complete"}
                        </button>
                      )}
                    </div>

                    {/* ✅ Updated Completion Message */}
                    {completed && !showCertificateModal && (
                      <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                        <div className="text-green-700">
                          <div className="text-4xl mb-2">🎉</div>
                          <h3 className="text-xl font-bold mb-2">Congratulations!</h3>
                          <p className="mb-4">You have successfully completed this course!</p>
                          <button
                            onClick={() => setShowCertificateModal(true)}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                          >
                            Get Your Certificate 🏆
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Course Overview */
                <div className="p-8 text-center">
                  <div className="max-w-3xl mx-auto">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">{course.title}</h1>
                    
                    <div className="flex items-center justify-center space-x-4 mb-6 text-sm">
                      <div className="flex items-center text-gray-600">
                        <User className="w-4 h-4 mr-1" />
                        <span>by {course.mentor}</span>
                      </div>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        <span className="text-gray-600">4.8</span>
                      </div>
                      <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                        {course.difficulty}
                      </span>
                    </div>
                    
                    <p className="text-lg text-gray-700 mb-8 leading-relaxed">{course.description}</p>

                    {/* Course Stats */}
                    <div className="grid grid-cols-3 gap-8 mb-8">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-indigo-600 mb-1">{modules.length}</div>
                        <div className="text-sm text-gray-600">Modules</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-indigo-600 mb-1">{getTotalLessons()}</div>
                        <div className="text-sm text-gray-600">Lessons</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-indigo-600 mb-1">{course.students}</div>
                        <div className="text-sm text-gray-600">Students</div>
                      </div>
                    </div>

                    {/* Course Intro Video */}
                    {(course.embed_url || course.video_url) && (
                      <div className="aspect-video rounded-xl overflow-hidden mb-8 shadow-lg bg-black">
                        <iframe
                          src={getEmbedUrl(course.embed_url || course.video_url)}
                          title={course.title}
                          allowFullScreen
                          className="w-full h-full"
                        />
                      </div>
                    )}

                    {getTotalLessons() > 0 ? (
                      <div>
                        <p className="text-gray-600 mb-6">
                          Ready to start learning? Select a lesson from the course content to begin your journey.
                        </p>
                        <button
                          onClick={() => {
                            const firstModule = modules[0]
                            const firstLessons = lessons[firstModule?.id] || []
                            if (firstLessons.length > 0) {
                              selectLesson(firstModule.id, firstLessons[0].id)
                            }
                          }}
                          className="px-8 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-lg transition-colors"
                        >
                          Start Learning
                        </button>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Coming Soon</h3>
                        <p className="text-yellow-700">Lessons are being prepared for this course. Check back soon!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ✅ Certificate Modal */}
      {showCertificateModal && course && (
        <CertificateModal
          isOpen={showCertificateModal}
          onClose={() => setShowCertificateModal(false)}
          courseTitle={course.title}
          courseMentor={course.mentor}
          courseId={course.id}
          userId={user?.uid || firebaseUser?.uid || 'anonymous'}
          walletId={user?.wallet || firebaseUser?.uid || 'no-wallet'} // Adjust based on your user structure
        />
      )}
    </div>
  )
}
