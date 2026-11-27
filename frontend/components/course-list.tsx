"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import type { Course } from "@/lib/types"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Loader2, BookOpen, AlertCircle, ArrowRight } from "lucide-react"
import api from "@/lib/api"

export function CourseList() {
  const { user, isLoadingAuth, token } = useAuth()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      toast.error("Please login to view courses.")
      router.push("/")
      return
    }
    if (!user) return

    const fetchCourses = async () => {
      setIsLoadingCourses(true)
      setError(null)
      try {
        const response = await api.get<Course[]>("/api/courses")
        setCourses(response.data)
      } catch (err: any) {
        const msg =
          err.code === "ERR_NETWORK"
            ? "Cannot reach the backend server. Make sure it is running."
            : err.response?.data?.message || "Failed to load courses."
        setError(msg)
        toast.error(msg)
      } finally {
        setIsLoadingCourses(false)
      }
    }

    fetchCourses()
  }, [user, isLoadingAuth, router, token])

  if (isLoadingAuth || isLoadingCourses) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading courses…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-16 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{error}</p>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="container py-24 text-center">
        <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
        <p className="font-medium text-foreground">No courses yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Check back soon — new content is on its way.</p>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">{courses.length} course{courses.length !== 1 ? "s" : ""} available</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <div
            key={course.id}
            className="group flex flex-col rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
          >
            <div className="flex flex-col flex-1 p-5 gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {course.subject}
                  </span>
                  {course.completed && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Completed
                    </span>
                  )}
                </div>
                <h2 className="font-semibold text-card-foreground leading-snug line-clamp-2">
                  {course.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {course.description}
                </p>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span className="font-medium text-foreground">{course.progress ?? 0}%</span>
                </div>
                <Progress value={course.progress ?? 0} className="h-1.5" />
              </div>

              <Link href={`/courses/${course.id}`} className="mt-auto">
                <Button variant="outline" className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                  View Course
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
