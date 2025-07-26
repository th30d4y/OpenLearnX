"use client"

import { CourseSidebar } from "@/components/course-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { useState, useEffect, use } from "react" // ✅ Added 'use' import
import type { Course } from "@/lib/types"
import api from "@/lib/api"

interface CourseOverviewPageProps {
  params: Promise<{ // ✅ Changed to Promise
    courseId: string
  }>
}

export default function CourseOverviewPage({ params }: CourseOverviewPageProps) {
  const { courseId } = use(params) // ✅ Unwrap params using React.use()
  const { user, firebaseUser, isLoadingAuth } = useAuth()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [isLoadingCourse, setIsLoadingCourse] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoadingAuth && !user && !firebaseUser) {
      toast.error("Please login to view courses.")
      router.push("/")
      return
    }

    const fetchCourse = async () => {
      setIsLoadingCourse(true)
      setError(null)
      try {
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
      fetchCourse()
    }
  }, [user, firebaseUser, isLoadingAuth, router, courseId])

  useEffect(() => {
    if (course && course.modules.length > 0 && course.modules[0].lessons.length > 0) {
      // Redirect to the first lesson of the course
      router.replace(`/courses/${courseId}/lesson/${course.modules[0].lessons[0].id}`)
    }
  }, [course, courseId, router])

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
      <CourseSidebar 
        courseId={course.id} 
        modules={course.modules} 
        activeLessonId="" 
      />
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <Card className="bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary-purple">
              {course.title} Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg text-gray-700 dark:text-gray-200">
              {course.description}
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              Select a lesson from the sidebar to begin.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
