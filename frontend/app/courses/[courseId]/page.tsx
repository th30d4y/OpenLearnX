"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "react-hot-toast"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"

type Lesson = {
  id: string
  title: string
  description?: string
  video_url?: string
}
type Module = {
  id: string
  title: string
  lessons: Lesson[]
}
type Course = {
  id: string
  title: string
  description: string
  modules: Module[]
  embed_url?: string
  video_url?: string
}

export default function CoursePage() {
  const { user, firebaseUser, isLoading: authLoading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const courseId = params?.courseId as string

  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Sidebar state: current
  const [selectedModuleIdx, setSelectedModuleIdx] = useState(0)
  const [selectedLessonIdx, setSelectedLessonIdx] = useState(0)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (!authLoading && !user && !firebaseUser) {
      toast.error("Please login to view courses.")
      router.replace("/")
      return
    }
    if ((user || firebaseUser) && courseId) {
      ;(async () => {
        setLoading(true)
        setError(null)
        try {
          const resp = await api.get<Course>(`/api/courses/${courseId}?t=${Date.now()}`)
          setCourse(resp.data)
          setSelectedModuleIdx(0)
          setSelectedLessonIdx(0)
          setCompleted(false)
        } catch {
          setError("Failed to load course data.")
        } finally {
          setLoading(false)
        }
      })()
    }
  }, [authLoading, user, firebaseUser, courseId, router])

  // Helper: embed URL
  function getEmbedUrl(url?: string): string | undefined {
    if (!url) return undefined
    const regExp = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^#&?]{11})/
    const match = url.match(regExp)
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`
    }
    // fallback (could already be an embed url or another provider)
    return url
  }

  const modules = course?.modules || []
  // Pick first non-empty for fallback if nothing selected
  const selModIdx = modules.length > 0 ? selectedModuleIdx : 0
  const lessons = modules.length > 0 ? modules[selModIdx]?.lessons : []
  const selLesIdx = lessons.length > 0 ? selectedLessonIdx : 0
  const currentLesson = lessons.length > 0 ? lessons[selLesIdx] : undefined

  // for navigation
  const isEnd =
    modules.length > 0 &&
    selModIdx === modules.length - 1 &&
    lessons.length > 0 &&
    selLesIdx === lessons.length - 1

  function prev() {
    if (selLesIdx > 0) setSelectedLessonIdx(selLesIdx - 1)
    else if (selModIdx > 0) {
      const prevLessons = modules[selModIdx - 1].lessons
      setSelectedModuleIdx(selModIdx - 1)
      setSelectedLessonIdx(Math.max(prevLessons.length - 1, 0))
    }
  }
  function next() {
    if (lessons.length && selLesIdx < lessons.length - 1) setSelectedLessonIdx(selLesIdx + 1)
    else if (selModIdx < modules.length - 1) {
      setSelectedModuleIdx(selModIdx + 1)
      setSelectedLessonIdx(0)
    }
  }

  function markComplete() {
    setCompleted(true)
    toast.success("Course Completed!")
  }

  if (authLoading || loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-700" /><span className="ml-2">Loading course...</span>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>
  )
  if (!course) return (
    <div className="flex items-center justify-center min-h-screen text-gray-700">Course not found.</div>
  )

  return (
    <div className="flex flex-col md:flex-row gap-6 max-w-7xl mx-auto px-4 py-8">
      {/* Sidebar: Always show all modules and lessons */}
      <aside className="w-full md:w-64 bg-white rounded-xl shadow-md p-4 md:sticky md:top-20 h-fit max-h-[80vh] overflow-y-auto mb-4 md:mb-0">
        <h2 className="text-lg font-bold mb-4 text-indigo-700">{course.title}</h2>
        <p className="text-xs text-gray-500 mb-5">{course.description}</p>
        {modules.length === 0 ? (
          <div className="text-gray-500 italic py-6">No modules yet for this course.</div>
        ) : (
          <ul>
            {modules.map((mod, mIdx) => (
              <li key={mod.id} className="mb-4">
                <div
                  className={`font-semibold mb-2 cursor-pointer ${
                    mIdx === selModIdx ? "text-purple-600" : "text-gray-700"
                  }`}
                  onClick={() => { setSelectedModuleIdx(mIdx); setSelectedLessonIdx(0); }}
                >
                  {mod.title}
                </div>
                <ul className="pl-4 border-l-2 border-gray-100">
                  {mod.lessons.map((lesson, lIdx) => (
                    <li
                      key={lesson.id}
                      className={
                        `py-1 px-2 rounded mb-1 cursor-pointer text-sm
                        ${mIdx===selModIdx && lIdx===selLesIdx
                          ? "bg-indigo-600 text-white"
                          : "hover:bg-indigo-100 text-gray-700"}`
                      }
                      onClick={() => { setSelectedModuleIdx(mIdx); setSelectedLessonIdx(lIdx); }}
                    >
                      {lesson.title}
                    </li>
                  ))}
                  {mod.lessons.length === 0 && (
                    <li className="text-xs text-gray-400 pl-1 py-1">No lessons</li>
                  )}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Main: show lesson or course video/desc/mark as read */}
      <main className="flex-1 bg-white rounded-xl shadow-md p-6 min-h-80 max-w-2xl mx-auto">
        {modules.length > 0 && lessons.length > 0 && currentLesson ? (
          <>
            <h2 className="text-2xl font-bold mb-2">{currentLesson.title}</h2>
            {currentLesson.video_url && (
              <div className="aspect-video rounded overflow-hidden my-4 shadow-lg">
                <iframe
                  src={getEmbedUrl(currentLesson.video_url)}
                  title={currentLesson.title}
                  allowFullScreen
                  width="100%"
                  height="100%"
                  className="w-full h-full"
                />
              </div>
            )}
            {currentLesson.description && (
              <div className="text-gray-700 mb-6">{currentLesson.description}</div>
            )}
            {/* Navigation / mark as read */}
            <div className="flex justify-between gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-60"
                onClick={prev}
                disabled={selModIdx===0 && selLesIdx===0}
              >
                Previous
              </button>
              {!isEnd ? (
                <button className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={next}>
                  Next
                </button>
              ) : (
                <button
                  className={`px-4 py-2 rounded font-semibold ${
                    completed
                      ? "bg-green-600 text-white"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  }`}
                  onClick={markComplete}
                  disabled={completed}
                >
                  {completed ? "Course Completed ✓" : "Mark as Read"}
                </button>
              )}
            </div>
            {completed && (
              <div className="mt-6 bg-green-50 border border-green-300 p-4 rounded text-green-700 text-center font-bold shadow">
                🎉 Course Completed! Certificate coming soon.
              </div>
            )}
          </>
        ) :
        // Course has no modules or no lessons
        (
          <div>
            <h2 className="text-2xl font-bold mb-3">{course.title}</h2>
            <p className="mb-6 text-gray-700">{course.description}</p>
            {(course.embed_url || course.video_url) ? (
              <div className="aspect-video rounded-lg overflow-hidden my-5 shadow-lg">
                <iframe
                  src={getEmbedUrl(course.embed_url || course.video_url)}
                  title={`Video for ${course.title}`}
                  allowFullScreen
                  width="100%"
                  height="100%"
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="text-gray-400 italic mb-4">No video available for this course yet.</div>
            )}
            <div className="mt-8 text-gray-500 text-center">
              No modules or lessons yet.
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
