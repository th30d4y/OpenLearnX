"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Loader2, Play, Clock, BookOpen, ChevronDown, ChevronRight, User, Users, Star, CheckCircle } from "lucide-react"
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
  const { user, isLoading: authLoading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const courseId = params?.courseId as string

  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [lessons, setLessons] = useState<{ [moduleId: string]: Lesson[] }>({})
  const [loading, setLoading] = useState(true)
  const [modulesLoading, setModulesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [expandedModules, setExpandedModules] = useState<{ [moduleId: string]: boolean }>({})
  const [completed, setCompleted] = useState(false)
  const [showCertificateModal, setShowCertificateModal] = useState(false)

  const logCourseActivity = async (action: "view" | "start" | "lesson_view", lessonId?: string) => {
    try {
      const token = localStorage.getItem("openlearnx_jwt_token")
      await fetch(`http://127.0.0.1:5000/api/courses/${courseId}/activity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action, lesson_id: lessonId }),
      })
    } catch {
      // Activity logging should not block course UX.
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please login to view courses.")
      router.replace("/")
      return
    }
    if (user && courseId) {
      fetchCourseData()
    }
  }, [authLoading, user, courseId, router])

  const fetchCourseData = async () => {
    setLoading(true)
    setError(null)

    try {
      const courseResponse = await api.get<Course>(`/api/courses/${courseId}?t=${Date.now()}`)
      setCourse(courseResponse.data)
      logCourseActivity("view")
      await fetchModulesAndLessons(courseId)
    } catch (err: any) {
      setError(err.message || "Failed to load course data.")
      toast.error("Failed to load course data.")
    } finally {
      setLoading(false)
    }
  }

  const fetchModulesAndLessons = async (id: string) => {
    setModulesLoading(true)

    try {
      const modulesResponse = await fetch(`http://127.0.0.1:5000/api/courses/${id}/modules`, {
        headers: { "Content-Type": "application/json" },
      })

      if (!modulesResponse.ok) {
        setModules([])
        setLessons({})
        return
      }

      const modulesData = await modulesResponse.json()
      let modulesList: Module[] = []

      if (modulesData.success && Array.isArray(modulesData.modules)) modulesList = modulesData.modules
      else if (Array.isArray(modulesData.modules)) modulesList = modulesData.modules
      else if (Array.isArray(modulesData)) modulesList = modulesData
      else if (Array.isArray(modulesData.data)) modulesList = modulesData.data

      modulesList = modulesList.sort((a, b) => a.order - b.order)
      setModules(modulesList)

      if (modulesList.length > 0) {
        await fetchLessonsForAllModules(modulesList)
      } else {
        setLessons({})
      }
    } catch {
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
        const lessonsResponse = await fetch(`http://127.0.0.1:5000/api/modules/${module.id}/lessons`, {
          headers: { "Content-Type": "application/json" },
        })

        if (!lessonsResponse.ok) {
          lessonsData[module.id] = []
          continue
        }

        const lessonData = await lessonsResponse.json()
        let lessonsList: Lesson[] = []

        if (lessonData.success && Array.isArray(lessonData.lessons)) lessonsList = lessonData.lessons
        else if (Array.isArray(lessonData.lessons)) lessonsList = lessonData.lessons
        else if (Array.isArray(lessonData)) lessonsList = lessonData
        else if (Array.isArray(lessonData.data)) lessonsList = lessonData.data

        lessonsData[module.id] = lessonsList.sort((a, b) => a.order - b.order)
        if (!selectedModuleId && lessonsData[module.id].length > 0) expandedState[module.id] = true
      } catch {
        lessonsData[module.id] = []
      }
    }

    setLessons(lessonsData)
    setExpandedModules(expandedState)

    if (!selectedModuleId && modulesList.length > 0) {
      const firstModule = modulesList[0]
      const firstModuleLessons = lessonsData[firstModule.id] || []
      setSelectedModuleId(firstModule.id)
      if (firstModuleLessons.length > 0) setSelectedLessonId(firstModuleLessons[0].id)
    }
  }

  const getEmbedUrl = (url?: string): string | undefined => {
    if (!url) return undefined
    const regExp = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^#&?]{11})/
    const match = url.match(regExp)
    if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`
    return url
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }))
  }

  const selectLesson = (moduleId: string, lessonId: string) => {
    setSelectedModuleId(moduleId)
    setSelectedLessonId(lessonId)
    setExpandedModules((prev) => ({ ...prev, [moduleId]: true }))
    logCourseActivity("lesson_view", lessonId)
  }

  const getCurrentLesson = (): Lesson | null => {
    if (!selectedModuleId || !selectedLessonId) return null
    return (lessons[selectedModuleId] || []).find((lesson) => lesson.id === selectedLessonId) || null
  }

  const getAllLessons = (): Lesson[] => {
    const all: Lesson[] = []
    modules.forEach((module) => {
      all.push(...(lessons[module.id] || []))
    })
    return all
  }

  const navigateLesson = (direction: "prev" | "next") => {
    const allLessons = getAllLessons()
    const currentIndex = allLessons.findIndex((lesson) => lesson.id === selectedLessonId)

    if (direction === "prev" && currentIndex > 0) {
      const prevLesson = allLessons[currentIndex - 1]
      selectLesson(prevLesson.module_id, prevLesson.id)
    } else if (direction === "next" && currentIndex < allLessons.length - 1) {
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

  const markComplete = async () => {
    try {
      const token = localStorage.getItem("openlearnx_jwt_token")
      if (selectedLessonId) {
        await fetch(`http://127.0.0.1:5000/api/courses/${courseId}/lessons/${selectedLessonId}/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
      }
    } catch {
      // Keep UX smooth even if completion log write fails.
    }
    setCompleted(true)
    setShowCertificateModal(true)
  }

  const getTotalLessons = () => Object.values(lessons).reduce((total, moduleLessons) => total + moduleLessons.length, 0)

  const currentLesson = getCurrentLesson()

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-700 dark:text-gray-300">Loading course...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-white dark:bg-gray-800 p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Unable to load course</h2>
          <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>
          <button
            onClick={fetchCourseData}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white dark:bg-gray-800 p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Course not found</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">This course is unavailable or was removed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="w-full px-6 sm:px-8 lg:px-12 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{course.title}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">by {course.mentor}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1.5">
              <BookOpen className="w-4 h-4" />
              <span>{modules.length} modules</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1.5">
              <Play className="w-4 h-4" />
              <span>{getTotalLessons()} lessons</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1.5">
              <Users className="w-4 h-4" />
              <span>{course.students.toLocaleString()} students</span>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-6 sm:px-8 lg:px-12 py-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <aside className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 sticky top-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Course Content</h2>

            {modulesLoading && (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300">Loading modules...</p>
              </div>
            )}

            {!modulesLoading && modules.length === 0 && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-5 text-center">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">No content available yet</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Lessons for this course have not been published.
                </p>
                <button
                  onClick={() => fetchModulesAndLessons(courseId)}
                  className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Refresh
                </button>
              </div>
            )}

            {!modulesLoading && modules.length > 0 && (
              <div className="space-y-3">
                {modules.map((module, index) => (
                  <div key={module.id} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleModule(module.id)}
                      className={`w-full px-4 py-3 text-left flex items-center justify-between ${
                        selectedModuleId === module.id ? "bg-blue-50 dark:bg-blue-900/20" : "bg-white dark:bg-gray-800"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {index + 1}. {module.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {(lessons[module.id]?.length || 0)} lessons
                        </p>
                      </div>
                      {expandedModules[module.id] ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>

                    {expandedModules[module.id] && (
                      <div className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                        {(lessons[module.id] || []).length > 0 ? (
                          (lessons[module.id] || []).map((lesson) => (
                            <button
                              key={lesson.id}
                              onClick={() => selectLesson(module.id, lesson.id)}
                              className={`w-full px-4 py-3 text-left border-l-2 ${
                                selectedLessonId === lesson.id
                                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                                  : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
                              }`}
                            >
                              <p className="text-sm text-gray-900 dark:text-white">{lesson.title}</p>
                              {lesson.duration && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {lesson.duration}
                                </p>
                              )}
                            </button>
                          ))
                        ) : (
                          <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No lessons in this module.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="lg:col-span-3">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            {currentLesson ? (
              <>
                {(currentLesson.embed_url || currentLesson.video_url) && (
                  <div className="aspect-video bg-black">
                    <iframe
                      src={getEmbedUrl(currentLesson.embed_url || currentLesson.video_url)}
                      title={currentLesson.title}
                      allowFullScreen
                      className="w-full h-full"
                      loading="lazy"
                    />
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 mb-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1">
                      <User className="w-4 h-4" /> {course.mentor}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 font-medium">
                      {course.difficulty}
                    </span>
                  </div>

                  <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-3">{currentLesson.title}</h2>

                  {currentLesson.description && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">About this lesson</h3>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{currentLesson.description}</p>
                    </div>
                  )}

                  {currentLesson.content && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Lesson notes</h3>
                      <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-4 text-gray-800 dark:text-gray-200 whitespace-pre-line">
                        {currentLesson.content}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                    <button
                      onClick={() => navigateLesson("prev")}
                      disabled={isFirstLesson()}
                      className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-100"
                    >
                      Previous
                    </button>

                    {!isLastLesson() ? (
                      <button
                        onClick={() => navigateLesson("next")}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        onClick={markComplete}
                        disabled={completed}
                        className={`px-4 py-2 rounded-lg text-white ${completed ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"}`}
                      >
                        {completed ? "Completed" : "Mark as complete"}
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">{course.title}</h2>
                <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-gray-700 dark:text-gray-300">
                    <User className="w-4 h-4" /> by {course.mentor}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1 text-yellow-700 dark:text-yellow-300">
                    <Star className="w-4 h-4" /> 4.8 rating
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-blue-700 dark:text-blue-300">
                    {course.difficulty}
                  </span>
                </div>

                <p className="mt-6 text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">{course.description}</p>

                {(course.embed_url || course.video_url) && (
                  <div className="mt-8 aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 bg-black max-w-4xl mx-auto">
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
                      if (firstModule && firstLessons.length > 0) {
                        logCourseActivity("start")
                        selectLesson(firstModule.id, firstLessons[0].id)
                      }
                    }}
                    className="mt-8 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Start learning
                  </button>
                ) : (
                  <div className="mt-8 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-5 max-w-xl mx-auto">
                    <p className="text-gray-700 dark:text-gray-300">Lessons are not published yet for this course.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {showCertificateModal && course && (
        <CertificateModal
          isOpen={showCertificateModal}
          onClose={() => setShowCertificateModal(false)}
          courseTitle={course.title}
          courseMentor={course.mentor}
          courseId={course.id}
          userId={user?.id || "anonymous"}
          walletId={user?.wallet_address || "no-wallet"}
        />
      )}
    </div>
  )
}
