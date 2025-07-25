"use client"

import { CourseSidebar } from "@/components/course-sidebar"
import { LessonViewer } from "@/components/lesson-viewer"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { useState, useEffect } from "react"
import type { Course } from "@/lib/types"
import api from "@/lib/api" // Corrected import: default import

interface CourseDetailPageProps {
  params: {
    courseId: string
    lessonId: string
  }
}

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { courseId, lessonId } = params
  const { user, firebaseUser, isLoadingAuth } = useAuth() // Allow firebaseUser
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [isLoadingCourse, setIsLoadingCourse] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoadingAuth && !user && !firebaseUser) {
      // Allow either MetaMask or Firebase user
      toast.error("Please login to view courses.")
      router.push("/")
      return
    }

    const fetchCourse = async () => {
      setIsLoadingCourse(true)
      setError(null)
      try {
        // --- ORIGINAL API CALL (UNCOMMENT WHEN BACKEND IS READY) ---
        const response = await api.get<Course>(`/api/courses/${courseId}`)
        setCourse(response.data)
      } catch (err: any) {
        console.error("Failed to fetch course details:", err)
        setError(err.response?.data?.message || "Failed to load course details.")
        toast.error(err.response?.data?.message || "Failed to load course details.")
      } finally {
        setIsLoadingCourse(false)
      }
    }

    if (user || firebaseUser) {
      // Only fetch if either user type is logged in
      fetchCourse()
    }
  }, [user, firebaseUser, isLoadingAuth, router, courseId])

  if (isLoadingAuth || isLoadingCourse) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-purple" />
        <span className="ml-2 text-lg">Loading course...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)] text-red-500">
        <p>{error}</p>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)] text-gray-600 dark:text-gray-300">
        <p className="text-xl">Course not found.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
      <CourseSidebar courseId={course.id} modules={course.modules} activeLessonId={lessonId} />
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <LessonViewer courseId={course.id} lessonId={lessonId} />
      </div>
    </div>
  )
}
