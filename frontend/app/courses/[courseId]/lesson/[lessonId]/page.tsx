"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "react-hot-toast"
import { useAuth } from "@/context/auth-context"
import api from "@/lib/api"
import { CourseSidebar } from "@/components/course-sidebar"
import { LessonViewer } from "@/components/lesson-viewer"
import { Loader2 } from "lucide-react"
import type { Course } from "@/lib/types"

export default function LessonDetailPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params?.courseId ?? ''
  const lessonId = params?.lessonId ?? ''
  const { user, firebaseUser, isLoading: isAuthLoading } = useAuth()

  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthLoading && !user && !firebaseUser) {
      toast.error("Please login to view lessons.")
      router.replace("/")
      return
    }

    if ((user || firebaseUser) && courseId) {
      const fetchCourse = async () => {
        setLoading(true)
        setError(null)
        try {
          const response = await api.get<Course>(`/api/courses/${courseId}?t=${Date.now()}`)
          setCourse(response.data)
        } catch (err: any) {
          setError(err.message || "Failed to load course.")
          toast.error(err.message || "Failed to load course.")
        } finally {
          setLoading(false)
        }
      }
      fetchCourse()
    }
  }, [user, firebaseUser, isAuthLoading, router, courseId])

  if (isAuthLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <span className="ml-3 text-indigo-700 text-lg">Loading lesson...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white text-red-600">
        <p>{error}</p>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white text-gray-700">
        <p>Course not found.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <CourseSidebar courseId={course.id} modules={course.modules} activeLessonId={lessonId} />
      <main className="flex-grow p-8 max-w-4xl mx-auto w-full">
        <LessonViewer courseId={course.id} lessonId={lessonId} />
      </main>
    </div>
  )
}
