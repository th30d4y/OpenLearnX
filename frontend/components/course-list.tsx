"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import type { Course } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import api from "@/lib/api" // Corrected import: default import

export function CourseList() {
  const { user, firebaseUser, isLoadingAuth, authMethod, token } = useAuth() // Check token for access
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoadingAuth && !user && !firebaseUser) {
      // Allow either MetaMask or Firebase user
      toast.error("Please login to view courses.")
      router.push("/")
      return
    }

    const fetchCourses = async () => {
      setIsLoadingCourses(true)
      setError(null)
      try {
        const response = await api.get<Course[]>("/api/courses")
        setCourses(response.data)
      } catch (err: any) {
        console.error("Failed to fetch courses:", err)
        if (err.code === "ERR_NETWORK") {
          setError(
            "Network Error: Could not connect to the backend server. Please ensure your Flask backend is running and accessible.",
          )
          toast.error("Network Error: Backend server unreachable.")
        } else {
          setError(err.response?.data?.message || "Failed to load courses.")
          toast.error(err.response?.data?.message || "Failed to load courses.")
        }
      } finally {
        setIsLoadingCourses(false)
      }
    }

    if (user || firebaseUser) {
      // Fetch if either user type is logged in
      fetchCourses()
    }
  }, [user, firebaseUser, isLoadingAuth, router, token])

  if (isLoadingAuth || isLoadingCourses) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-purple" />
        <span className="ml-2 text-lg">Loading courses...</span>
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

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-gray-600 dark:text-gray-300">
        <p className="text-xl mb-4">No courses available yet.</p>
        <p>Check back later for new content!</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {authMethod === "firebase" && !token && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-md dark:bg-yellow-900 dark:border-yellow-600 dark:text-yellow-200">
          <p className="font-bold">Limited Access</p>
          <p>
            You are logged in with email. Full functionality, including progress tracking and data persistence, requires
            connecting your MetaMask wallet.
          </p>
        </div>
      )}
      <h1 className="text-3xl font-bold text-primary-purple mb-8 text-center">Available Courses</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Card
            key={course.id}
            className="bg-white shadow-md rounded-lg overflow-hidden dark:bg-gray-800 dark:text-gray-100"
          >
            <CardHeader>
              <CardTitle className="text-xl font-semibold">{course.title}</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">{course.subject}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 dark:text-gray-200">{course.description}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                  <span>Progress</span>
                  <span>{course.progress}%</span>
                </div>
                <Progress value={course.progress} className="h-2 bg-primary-blue" />
              </div>
              <Link href={`/courses/${course.id}`}>
                <Button className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white">View Course</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
