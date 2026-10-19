"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Loader2, Play, Clock, BookOpen, ChevronDown, ChevronRight, User, Users, CheckCircle } from "lucide-react"
import { toast } from "react-hot-toast"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { CertificateModal } from "@/components/certificate-modal"
import { Button } from "@/components/ui/button"

type Course = {
  id: string
  title: string
  description: string
  subject: string
  difficulty: string
  mentor: string
  students?: number
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
  const { user, isLoadingAuth: authLoading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const courseId = params?.courseId as string

  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [lessons, setLessons] = useState<{ [moduleId: string]: Lesson[] }>({})
  const [loading, setLoading] = useState(true)
  const [modulesLoading, setModulesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resolvedCourseId, setResolvedCourseId] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)

  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [expandedModules, setExpandedModules] = useState<{ [moduleId: string]: boolean }>({})
  const [completed, setCompleted] = useState(false)
  const [showCertificateModal, setShowCertificateModal] = useState(false)

  const logCourseActivity = async (
    action: "view" | "start" | "lesson_view",
    lessonId?: string,
    overrideCourseId?: string,
  ) => {
    try {
      const token = localStorage.getItem("openlearnx_jwt_token") || localStorage.getItem("openlearnx_token")
      const targetCourseId = overrideCourseId || courseId
      await fetch(`http://127.0.0.1:5000/api/courses/${targetCourseId}/activity`, {
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

  const fetchRegistrationStatus = async (targetId: string) => {
    try {
      const token = localStorage.getItem("openlearnx_jwt_token") || localStorage.getItem("openlearnx_token")
      const resp = await fetch(`http://127.0.0.1:5000/api/courses/${targetId}/registration`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!resp.ok) return
      const data = await resp.json()
      if (data?.success) setIsRegistered(Boolean(data.registered))
    } catch {
      // Ignore registration fetch errors.
    }
  }

  const fetchCourseData = async () => {
    setLoading(true)
    setError(null)
    try {
      const courseResponse = await api.get<Course>(`/api/courses/${courseId}?t=${Date.now()}`)
      const courseData = courseResponse.data
      const targetId = courseData.id || courseId
      setCourse(courseData)
      setResolvedCourseId(targetId)
      logCourseActivity("view", undefined, targetId)
      await fetchRegistrationStatus(targetId)
      await fetchModulesAndLessons(targetId)
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
      if (!modulesResponse.ok) { setModules([]); setLessons({}); return }

      const modulesData = await modulesResponse.json()
      let modulesList: Module[] = []
      if (modulesData.success && Array.isArray(modulesData.modules)) modulesList = modulesData.modules
      else if (Array.isArray(modulesData.modules)) modulesList = modulesData.modules
      else if (Array.isArray(modulesData)) modulesList = modulesData
      else if (Array.isArray(modulesData.data)) modulesList = modulesData.data

      modulesList = modulesList.sort((a, b) => a.order - b.order)
      setModules(modulesList)
      if (modulesList.length > 0) await fetchLessonsForAllModules(modulesList)
      else setLessons({})
    } catch {
      setModules([]); setLessons({})
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
        if (!lessonsResponse.ok) { lessonsData[module.id] = []; continue }

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
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }))
  }

  const selectLesson = (moduleId: string, lessonId: string) => {
    setSelectedModuleId(moduleId)
    setSelectedLessonId(lessonId)
    setExpandedModules(prev => ({ ...prev, [moduleId]: true }))
    logCourseActivity("lesson_view", lessonId, resolvedCourseId || undefined)
  }

  const handleRegister = async () => {
    if (!resolvedCourseId) return
    setIsRegistering(true)
    try {
      const token = localStorage.getItem("openlearnx_jwt_token") || localStorage.getItem("openlearnx_token")
      const resp = await fetch(`http://127.0.0.1:5000/api/courses/${resolvedCourseId}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Registration failed" }))
        toast.error(err.error || "Registration failed")
        return
      }
      setIsRegistered(true)
      toast.success("Registered for this course")
    } finally {
      setIsRegistering(false)
    }
  }

  const getCurrentLesson = (): Lesson | null => {
    if (!selectedModuleId || !selectedLessonId) return null
    return (lessons[selectedModuleId] || []).find(lesson => lesson.id === selectedLessonId) || null
  }

  const getAllLessons = (): Lesson[] => {
    const all: Lesson[] = []
    modules.forEach(module => { all.push(...(lessons[module.id] || [])) })
    return all
  }

  const navigateLesson = (direction: "prev" | "next") => {
    const allLessons = getAllLessons()
    const currentIndex = allLessons.findIndex(lesson => lesson.id === selectedLessonId)
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
      const token = localStorage.getItem("openlearnx_jwt_token") || localStorage.getItem("openlearnx_token")
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

  const getTotalLessons = () =>
    Object.values(lessons).reduce((total, moduleLessons) => total + moduleLessons.length, 0)

  const difficultyBadge = (d: string) => {
    switch (d?.toLowerCase()) {
      case 'easy': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
      case 'hard': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
      default: return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
    }
  }

  const currentLesson = getCurrentLesson()

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading course…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center space-y-4">
          <h2 className="text-xl font-semibold text-card-foreground">Unable to load course</h2>
          <p className="text-sm text-destructive">{error}</p>
          <Button onClick={fetchCourseData}>Retry</Button>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <h2 className="text-xl font-semibold text-card-foreground">Course not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">This course is unavailable or was removed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Course header */}
      <header className="border-b border-border bg-card">
        <div className="w-full px-6 sm:px-8 lg:px-12 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-card-foreground">{course.title}</h1>
            <p className="text-sm text-muted-foreground">by {course.mentor || "OpenLearnX Instructor"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {!isRegistered && (
              <Button onClick={handleRegister} disabled={isRegistering} size="sm">
                {isRegistering ? "Registering…" : "Register"}
              </Button>
            )}
            {isRegistered && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-3 py-1 text-xs font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> Registered
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
              <BookOpen className="w-3.5 h-3.5" /> {modules.length} modules
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
              <Play className="w-3.5 h-3.5" /> {getTotalLessons()} lessons
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
              <Users className="w-3.5 h-3.5" /> {Number(course.students || 0).toLocaleString()} students
            </span>
          </div>
        </div>
      </header>

      <main className="w-full px-6 sm:px-8 lg:px-12 py-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Sidebar: module/lesson tree */}
        <aside className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-5 sticky top-4">
            <h2 className="text-base font-semibold text-card-foreground mb-4">Course Content</h2>

            {modulesLoading && (
              <div className="text-center py-8 space-y-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Loading modules…</p>
              </div>
            )}

            {!modulesLoading && modules.length === 0 && (
              <div className="rounded-lg border border-border bg-muted/30 p-5 text-center space-y-3">
                <h3 className="text-sm font-semibold text-card-foreground">No content available yet</h3>
                <p className="text-xs text-muted-foreground">Lessons for this course have not been published.</p>
                <Button variant="outline" size="sm" onClick={() => fetchModulesAndLessons(courseId)}>Refresh</Button>
              </div>
            )}

            {!modulesLoading && modules.length > 0 && (
              <div className="space-y-2">
                {modules.map((module, index) => (
                  <div key={module.id} className="rounded-lg border border-border overflow-hidden">
                    <button
                      onClick={() => toggleModule(module.id)}
                      className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${
                        selectedModuleId === module.id ? "bg-primary/5" : "bg-card hover:bg-muted/50"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{index + 1}. {module.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{lessons[module.id]?.length || 0} lessons</p>
                      </div>
                      {expandedModules[module.id]
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </button>

                    {expandedModules[module.id] && (
                      <div className="border-t border-border bg-muted/20">
                        {(lessons[module.id] || []).length > 0 ? (
                          (lessons[module.id] || []).map(lesson => (
                            <button
                              key={lesson.id}
                              onClick={() => selectLesson(module.id, lesson.id)}
                              className={`w-full px-4 py-2.5 text-left border-l-2 transition-colors ${
                                selectedLessonId === lesson.id
                                  ? "border-primary bg-primary/5"
                                  : "border-transparent hover:bg-muted/40"
                              }`}
                            >
                              <p className="text-sm text-foreground">{lesson.title}</p>
                              {lesson.duration && (
                                <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {lesson.duration}
                                </p>
                              )}
                            </button>
                          ))
                        ) : (
                          <p className="px-4 py-3 text-sm text-muted-foreground">No lessons in this module.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main content area */}
        <section className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
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

                <div className="p-6 space-y-5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                      <User className="w-3.5 h-3.5" /> {course.mentor}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${difficultyBadge(course.difficulty)}`}>
                      {course.difficulty}
                    </span>
                  </div>

                  <h2 className="text-2xl font-semibold text-card-foreground">{currentLesson.title}</h2>

                  {currentLesson.description && (
                    <div>
                      <h3 className="text-sm font-semibold text-card-foreground mb-1">About this lesson</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{currentLesson.description}</p>
                    </div>
                  )}

                  {currentLesson.content && (
                    <div>
                      <h3 className="text-sm font-semibold text-card-foreground mb-2">Lesson notes</h3>
                      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-foreground whitespace-pre-line">
                        {currentLesson.content}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
                    <Button variant="outline" onClick={() => navigateLesson("prev")} disabled={isFirstLesson()}>
                      Previous
                    </Button>
                    {!isLastLesson() ? (
                      <Button onClick={() => navigateLesson("next")}>Next</Button>
                    ) : (
                      <Button onClick={markComplete} disabled={completed} variant={completed ? "outline" : "default"} className="gap-2">
                        {completed && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                        {completed ? "Completed" : "Mark as complete"}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-card-foreground">{course.title}</h2>
                  <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
                      <User className="w-3.5 h-3.5" /> {course.mentor}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${difficultyBadge(course.difficulty)}`}>
                      {course.difficulty}
                    </span>
                  </div>
                </div>

                <p className="text-muted-foreground max-w-2xl mx-auto text-sm leading-relaxed">{course.description}</p>

                {(course.embed_url || course.video_url) && (
                  <div className="aspect-video rounded-xl overflow-hidden border border-border bg-black max-w-3xl mx-auto">
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
                  <Button
                    size="lg"
                    onClick={() => {
                      const firstModule = modules[0]
                      const firstLessons = lessons[firstModule?.id] || []
                      if (firstModule && firstLessons.length > 0) {
                        logCourseActivity("start")
                        selectLesson(firstModule.id, firstLessons[0].id)
                      }
                    }}
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Start Learning
                  </Button>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/30 p-5 max-w-xl mx-auto">
                    <p className="text-sm text-muted-foreground">Lessons are not published yet for this course.</p>
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
