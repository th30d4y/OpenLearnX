"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Loader2, Play, Clock, BookOpen, ChevronDown, ChevronRight, User, Users, Star, Award, TrendingUp, CheckCircle, ArrowRight } from "lucide-react"
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
  
  // Certificate Modal State
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
      
      const courseResponse = await api.get<Course>(`/api/courses/${courseId}?t=${Date.now()}`)
      const courseData = courseResponse.data
      console.log('✅ Course data loaded:', courseData)
      setCourse(courseData)

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
      
      let modulesData = null
      let modulesResponse = null
      
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
        
        if (modulesData.success && modulesData.modules && Array.isArray(modulesData.modules)) {
          modulesList = modulesData.modules
        } else if (modulesData.modules && Array.isArray(modulesData.modules)) {
          modulesList = modulesData.modules
        } else if (Array.isArray(modulesData)) {
          modulesList = modulesData
        } else if (modulesData.data && Array.isArray(modulesData.data)) {
          modulesList = modulesData.data
        }
        
        modulesList = modulesList.sort((a, b) => a.order - b.order)
        
        console.log('🔍 Processed modules list:', modulesList)
        setModules(modulesList)
        
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
        
        let lessonsResponse = await fetch(`http://127.0.0.1:5000/api/admin/modules/${module.id}/lessons`, {
          headers: {
            'Authorization': 'Bearer admin-secret-key',
            'Content-Type': 'application/json'
          }
        })
        
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
          
          lessonsList = lessonsList.sort((a, b) => a.order - b.order)
          lessonsData[module.id] = lessonsList
          
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
    
    if (!selectedModuleId && modulesList.length > 0) {
      const firstModule = modulesList[0]
      const firstModuleLessons = lessonsData[firstModule.id] || []
      
      setSelectedModuleId(firstModule.id)
      if (firstModuleLessons.length > 0) {
        setSelectedLessonId(firstModuleLessons[0].id)
      }
    }
  }

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

  const markComplete = () => {
    setCompleted(true)
    setShowCertificateModal(true)
  }

  const getTotalLessons = () => {
    return Object.values(lessons).reduce((total, moduleLessons) => total + moduleLessons.length, 0)
  }

  const currentLesson = getCurrentLesson()

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        </div>
        <div className="text-center z-10">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-white mx-auto mb-6 drop-shadow-lg" />
            <div className="absolute inset-0 h-16 w-16 border-4 border-transparent border-t-purple-400 rounded-full animate-ping mx-auto"></div>
          </div>
          <p className="text-xl text-white font-semibold tracking-wide animate-pulse">Loading your learning journey...</p>
          <div className="mt-4 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce animation-delay-200"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce animation-delay-400"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-pink-900 to-purple-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="bg-white/10 backdrop-blur-lg border border-red-300/30 rounded-3xl p-10 shadow-2xl animate-bounce">
            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Oops! Something went wrong</h2>
            <p className="text-red-200 mb-8 leading-relaxed">{error}</p>
            <button 
              onClick={fetchCourseData}
              className="px-8 py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl hover:from-red-600 hover:to-pink-600 shadow-lg transition-all duration-300 transform hover:scale-105 font-semibold text-lg"
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
      <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-10 animate-fadeIn">
          <div className="w-24 h-24 bg-gray-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <span className="text-4xl">🔍</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Course Not Found</h2>
          <p className="text-gray-300 leading-relaxed">The course you're looking for doesn't exist or may have been removed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-xl border-b border-purple-200 sticky top-0 z-50">
        <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-20">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-6 animate-slideInLeft">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
                <span className="text-white font-extrabold text-2xl">OL</span>
              </div>
              <div>
                <h1 className="text-2xl font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">{course.title}</h1>
                <p className="text-sm text-purple-700 font-semibold tracking-wide">by {course.mentor}</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8 text-sm text-purple-700 animate-slideInRight">
              <div className="flex items-center space-x-2 bg-purple-100 px-4 py-2 rounded-full">
                <BookOpen className="w-5 h-5 text-purple-600" />
                <span className="font-semibold">{modules.length} modules</span>
              </div>
              <div className="flex items-center space-x-2 bg-indigo-100 px-4 py-2 rounded-full">
                <Play className="w-5 h-5 text-indigo-600" />
                <span className="font-semibold">{getTotalLessons()} lessons</span>
              </div>
              <div className="flex items-center space-x-2 bg-pink-100 px-4 py-2 rounded-full">
                <Users className="w-5 h-5 text-pink-600" />
                <span className="font-semibold">{course.students.toLocaleString()} students</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-12 grid grid-cols-1 lg:grid-cols-5 gap-12 relative z-10">
        
        {/* Sidebar - Now takes up 2 columns on large screens */}
        <aside className="lg:col-span-2 animate-slideInLeft">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-purple-200 p-10 sticky top-28">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Course Content</h2>
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Enhanced Progress Bar */}
            <div className="mb-8 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-purple-700">Progress</span>
                <span className="text-sm font-bold text-indigo-600">25%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-1000 ease-out animate-pulse" style={{width: '25%'}}></div>
              </div>
            </div>

            {/* Debug Info - Enhanced */}
            <div className="mb-8 p-5 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl animate-fadeIn">
              <h3 className="text-sm font-bold text-blue-800 mb-4 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                🔍 Debug Info:
              </h3>
              <div className="text-xs space-y-2 text-blue-700">
                <p><strong>Course ID:</strong> {courseId}</p>
                <p><strong>Modules Loaded:</strong> {modules.length}</p>
                <p><strong>Total Lessons:</strong> {getTotalLessons()}</p>
                <p><strong>Modules Loading:</strong> {modulesLoading ? 'Yes' : 'No'}</p>
                <p><strong>Selected Module:</strong> {selectedModuleId || 'None'}</p>
                <p><strong>Selected Lesson:</strong> {currentLesson?.title || 'None'}</p>
                <p><strong>Expanded Modules:</strong> {Object.keys(expandedModules).length}</p>
              </div>
              {modules.length > 0 && (
                <details className="mt-4 border-t border-blue-200 pt-4">
                  <summary className="text-xs cursor-pointer text-blue-600 font-semibold hover:text-blue-800 transition-colors">Show Raw Data</summary>
                  <pre className="mt-3 text-xs p-4 bg-white rounded-xl shadow max-h-40 overflow-auto">
                    {JSON.stringify({ modules, lessons }, null, 2)}
                  </pre>
                </details>
              )}
            </div>

            {/* Loading State */}
            {modulesLoading && (
              <div className="text-center py-10 animate-pulse">
                <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
                <p className="text-lg text-purple-700 font-semibold">Loading modules...</p>
              </div>
            )}

            {/* No Modules State */}
            {!modulesLoading && modules.length === 0 && (
              <div className="text-center py-8 animate-bounce">
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-300 rounded-2xl p-6 text-yellow-800">
                  <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📚</span>
                  </div>
                  <h3 className="text-lg font-bold mb-3">No Modules Found</h3>
                  <p className="text-sm mb-4 leading-relaxed">
                    This could mean:<br />
                    &bull; No modules created yet<br />
                    &bull; API endpoint issues<br />
                    &bull; Course ID mismatch
                  </p>
                  <button
                    onClick={() => fetchModulesAndLessons(courseId)}
                    className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl text-white font-bold hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    Retry Loading Modules
                  </button>
                </div>
              </div>
            )}

            {/* Modules List */}
            {!modulesLoading && modules.length > 0 && (
              <div className="space-y-4">
                {modules.map((module, index) => (
                  <div key={module.id} className="border border-purple-200 rounded-2xl overflow-hidden shadow-lg bg-white/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300 animate-fadeInUp" style={{animationDelay: `${index * 100}ms`}}>
                    {/* Module Header */}
                    <button
                      onClick={() => toggleModule(module.id)}
                      className={`w-full px-6 py-5 text-left hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 flex items-center justify-between transition-all duration-300 ${
                        selectedModuleId === module.id ? 'bg-gradient-to-r from-purple-100 to-indigo-100 border-purple-300' : 'bg-white/80'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-4">
                          <span className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg transform hover:scale-110 transition-transform duration-300">
                            {index + 1}
                          </span>
                          <h3 className="font-bold text-purple-900 truncate text-lg">{module.title}</h3>
                        </div>
                        <p className="text-sm text-purple-600 mt-2 ml-14 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {(lessons[module.id]?.length ?? 0) + (lessons[module.id]?.length === 1 ? ' lesson' : ' lessons')}
                        </p>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <div className={`transform transition-transform duration-300 ${expandedModules[module.id] ? 'rotate-180' : ''}`}>
                          {expandedModules[module.id] ? (
                            <ChevronDown className="w-6 h-6 text-purple-500" />
                          ) : (
                            <ChevronRight className="w-6 h-6 text-purple-400" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Lessons */}
                    {expandedModules[module.id] && (
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-t border-purple-200 animate-slideDown">
                        {lessons[module.id] && lessons[module.id].length > 0 ? (
                          lessons[module.id].map((lesson, lessonIndex) => (
                            <button
                              key={lesson.id}
                              onClick={() => selectLesson(module.id, lesson.id)}
                              className={`w-full px-8 py-4 text-left hover:bg-gradient-to-r hover:from-purple-100 hover:to-indigo-100 transition-all duration-300 border-l-4 group ${
                                selectedLessonId === lesson.id
                                  ? 'border-purple-500 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-900 font-bold shadow-inner'
                                  : 'border-transparent text-purple-700 hover:border-purple-300'
                              }`}
                            >
                              <div className="flex items-center space-x-4">
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all duration-300 group-hover:scale-110 ${
                                  selectedLessonId === lesson.id
                                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
                                    : 'bg-purple-200 text-purple-700 group-hover:bg-purple-300'
                                }`}>
                                  <Play className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="truncate font-semibold">{lesson.title}</p>
                                  {lesson.duration && (
                                    <p className={`text-xs flex items-center mt-1 ${
                                      selectedLessonId === lesson.id ? 'text-purple-700 font-semibold' : 'text-purple-500'
                                    }`}>
                                      <Clock className="w-4 h-4 mr-2" />
                                      {lesson.duration}
                                    </p>
                                  )}
                                </div>
                                <ArrowRight className={`w-4 h-4 transition-all duration-300 ${
                                  selectedLessonId === lesson.id ? 'text-purple-600 transform scale-110' : 'text-transparent group-hover:text-purple-400'
                                }`} />
                              </div>
                            </button>
                          ))
                        ) : (
                          <p className="px-8 py-6 text-purple-600 text-sm italic text-center">No lessons in this module</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content - Now takes up 3 columns on large screens for full width */}
        <section className="lg:col-span-3 animate-slideInRight">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-purple-200 overflow-hidden">
            {currentLesson ? (
              <>
                {/* Video Player */}
                {(currentLesson.embed_url || currentLesson.video_url) && (
                  <div className="aspect-video bg-black rounded-t-3xl overflow-hidden relative group">
                    <iframe
                      src={getEmbedUrl(currentLesson.embed_url || currentLesson.video_url)}
                      title={currentLesson.title}
                      allowFullScreen
                      className="w-full h-full"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                )}

                {/* Lesson Content */}
                <div className="p-16">
                  {/* Lesson Header */}
                  <div className="mb-12 animate-fadeInUp">
                    <div className="flex items-center text-purple-600 space-x-4 mb-6">
                      <div className="flex items-center space-x-2 bg-purple-100 px-6 py-3 rounded-full">
                        <User className="w-6 h-6" />
                        <span className="font-bold text-lg">{course.mentor}</span>
                      </div>
                      <span className="text-purple-300">•</span>
                      <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-6 py-3 rounded-full text-lg font-bold uppercase tracking-widest shadow-lg">
                        {course.difficulty}
                      </span>
                    </div>
                    <h1 className="text-6xl font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent leading-tight mb-6 drop-shadow-sm">{currentLesson.title}</h1>
                    {currentLesson.duration && (
                      <div className="flex items-center text-purple-600 space-x-3 text-xl font-semibold">
                        <div className="flex items-center space-x-2 bg-purple-100 px-6 py-3 rounded-full">
                          <Clock className="w-6 h-6" />
                          <span>{currentLesson.duration}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lesson Description */}
                  {currentLesson.description && (
                    <section className="mb-16 animate-fadeInUp animation-delay-200">
                      <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-8 border-b-2 border-purple-200 pb-4">
                        About this lesson
                      </h2>
                      <article className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-3xl p-10 text-purple-900 prose max-w-none shadow-inner border border-purple-200 text-lg leading-relaxed">
                        {currentLesson.description}
                      </article>
                    </section>
                  )}

                  {/* Lesson Content */}
                  {currentLesson.content && (
                    <section className="mb-16 animate-fadeInUp animation-delay-400">
                      <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-8 border-b-2 border-purple-200 pb-4">
                        Lesson Content
                      </h2>
                      <article className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-3xl p-10 text-purple-900 prose max-w-none whitespace-pre-line shadow-inner border border-purple-200 text-lg leading-relaxed">
                        {currentLesson.content}
                      </article>
                    </section>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between items-center pt-12 border-t-2 border-purple-200 animate-fadeInUp animation-delay-600">
                    <button
                      onClick={() => navigateLesson('prev')}
                      disabled={isFirstLesson()}
                      className="px-12 py-5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-3xl hover:from-gray-200 hover:to-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all duration-300 transform hover:scale-105 shadow-lg text-xl"
                    >
                      ← Previous Lesson
                    </button>

                    {!isLastLesson() ? (
                      <button
                        onClick={() => navigateLesson('next')}
                        className="px-12 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-3xl hover:from-purple-700 hover:to-indigo-700 font-bold transition-all duration-300 transform hover:scale-105 shadow-xl text-xl"
                      >
                        Next Lesson →
                      </button>
                    ) : (
                      <button
                        onClick={markComplete}
                        disabled={completed}
                        className={`px-12 py-5 rounded-3xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl text-xl ${
                          completed
                            ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white cursor-not-allowed shadow-inner"
                            : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                        }`}
                      >
                        {completed ? "✓ Course Completed" : "Mark as Complete"}
                      </button>
                    )}
                  </div>

                  {/* Completion Message */}
                  {completed && !showCertificateModal && (
                    <div className="mt-16 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-3xl p-12 text-center shadow-2xl animate-bounce">
                      <div className="text-green-700">
                        <div className="text-8xl mb-8 animate-pulse">🎉</div>
                        <h3 className="text-4xl font-extrabold mb-6 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Congratulations!</h3>
                        <p className="mb-10 text-green-800 font-semibold text-2xl">
                          You have successfully completed this course!
                        </p>
                        <button
                          onClick={() => setShowCertificateModal(true)}
                          className="px-16 py-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-3xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 font-bold text-xl shadow-xl"
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
              <div className="p-20 text-center max-w-5xl mx-auto text-purple-900 animate-fadeIn">
                <h1 className="text-7xl font-extrabold mb-10 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-lg">{course.title}</h1>

                <div className="flex flex-wrap justify-center gap-8 mb-16 text-purple-700 font-bold text-xl">
                  <div className="flex items-center space-x-4 bg-purple-100 px-8 py-4 rounded-full shadow-lg transform hover:scale-105 transition-transform duration-300">
                    <User className="w-8 h-8" />
                    <span>by {course.mentor}</span>
                  </div>
                  <div className="flex items-center space-x-4 bg-yellow-100 px-8 py-4 rounded-full shadow-lg transform hover:scale-105 transition-transform duration-300">
                    <Star className="w-8 h-8 text-yellow-500" />
                    <span>4.8 Rating</span>
                  </div>
                  <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-8 py-4 rounded-full text-xl uppercase font-extrabold tracking-widest shadow-lg transform hover:scale-105 transition-transform duration-300">
                    {course.difficulty}
                  </span>
                </div>

                <p className="text-3xl max-w-5xl mx-auto mb-16 leading-relaxed tracking-wide text-purple-800">{course.description}</p>

                <div className="grid grid-cols-3 gap-16 mb-16">
                  <div className="text-center transform hover:scale-110 transition-transform duration-300">
                    <div className="w-32 h-32 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <span className="text-5xl font-extrabold text-white">{modules.length}</span>
                    </div>
                    <div className="uppercase text-purple-700 font-bold tracking-wide text-xl">Modules</div>
                  </div>
                  <div className="text-center transform hover:scale-110 transition-transform duration-300">
                    <div className="w-32 h-32 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <span className="text-5xl font-extrabold text-white">{getTotalLessons()}</span>
                    </div>
                    <div className="uppercase text-purple-700 font-bold tracking-wide text-xl">Lessons</div>
                  </div>
                  <div className="text-center transform hover:scale-110 transition-transform duration-300">
                    <div className="w-32 h-32 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <span className="text-5xl font-extrabold text-white">{course.students.toLocaleString()}</span>
                    </div>
                    <div className="uppercase text-purple-700 font-bold tracking-wide text-xl">Students</div>
                  </div>
                </div>

                {(course.embed_url || course.video_url) && (
                  <div className="aspect-video rounded-3xl overflow-hidden shadow-2xl mx-auto max-w-6xl bg-black border-4 border-purple-600 mb-16 transform hover:scale-105 transition-transform duration-500">
                    <iframe
                      src={getEmbedUrl(course.embed_url || course.video_url)}
                      title={course.title}
                      allowFullScreen
                      className="w-full h-full"
                      loading="lazy"
                    />
                  </div>
                )}

                {getTotalLessons() > 0 ? (
                  <button
                    onClick={() => {
                      const firstModule = modules[0]
                      const firstLessons = lessons[firstModule?.id] || []
                      if (firstLessons.length > 0) {
                        selectLesson(firstModule.id, firstLessons[0].id)
                      }
                    }}
                    className="mt-12 px-20 py-8 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white rounded-3xl hover:from-purple-700 hover:via-pink-700 hover:to-indigo-700 font-extrabold text-3xl shadow-2xl transition-all duration-300 transform hover:scale-110 hover:shadow-purple-500/25"
                  >
                    🚀 Start Learning Journey
                  </button>
                ) : (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-3xl p-12 text-yellow-800 text-2xl font-bold max-w-lg mx-auto shadow-xl">
                    <div className="w-24 h-24 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-8">
                      <span className="text-4xl">🚧</span>
                    </div>
                    <h3 className="text-3xl mb-6">Coming Soon</h3>
                    <p className="font-normal text-yellow-700 text-xl">
                      Amazing lessons are being crafted for this course. Check back soon!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Certificate Modal */}
      {showCertificateModal && course && (
        <CertificateModal
          isOpen={showCertificateModal}
          onClose={() => setShowCertificateModal(false)}
          courseTitle={course.title}
          courseMentor={course.mentor}
          courseId={course.id}
          userId={user?.uid || firebaseUser?.uid || 'anonymous'}
          walletId={user?.wallet || firebaseUser?.uid || 'no-wallet'}
        />
      )}

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 500px; }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-fadeIn { animation: fadeIn 1s ease-out; }
        .animate-fadeInUp { animation: fadeInUp 0.8s ease-out; }
        .animate-slideInLeft { animation: slideInLeft 0.8s ease-out; }
        .animate-slideInRight { animation: slideInRight 0.8s ease-out; }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-400 { animation-delay: 0.4s; }
        .animation-delay-600 { animation-delay: 0.6s; }
        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-2000 { animation-delay: 2s; }
      `}</style>
    </div>
  )
}
