"use client"

import Link from "next/link"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import type { Lesson } from "@/lib/types"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { api } from "@/lib/api"

interface LessonViewerProps {
  courseId: string
  lessonId: string
}

export function LessonViewer({ courseId, lessonId }: LessonViewerProps) {
  const { user, firebaseUser, isLoadingAuth, authMethod, token } = useAuth() // Check token for access
  const router = useRouter()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [isLoadingLesson, setIsLoadingLesson] = useState(true)
  const [isMarkingCompleted, setIsMarkingCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoadingAuth && !user && !firebaseUser) {
      // Allow either MetaMask or Firebase user
      toast.error("Please login to view lessons.")
      router.push("/")
      return
    }

    const fetchLesson = async () => {
      setIsLoadingLesson(true)
      setError(null)
      try {
        const response = await api.get<Lesson>(`/api/courses/${courseId}/lessons/${lessonId}`)
        setLesson(response.data)
      } catch (err: any) {
        console.error("Failed to fetch lesson:", err)
        setError(err.response?.data?.message || "Failed to load lesson.")
        toast.error(err.response?.data?.message || "Failed to load lesson.")
      } finally {
        setIsLoadingLesson(false)
      }
    }

    if (user || firebaseUser) {
      // Only fetch if either user type is logged in
      fetchLesson()
    }
  }, [user, firebaseUser, isLoadingAuth, router, courseId, lessonId, token])

  const markLessonCompleted = async () => {
    if (!lesson || lesson.completed || !token) {
      toast.error("Please connect your MetaMask wallet to mark lessons as completed.")
      return // Ensure token exists for this action
    }
    setIsMarkingCompleted(true)
    try {
      await api.post(`/api/courses/${courseId}/lessons/${lessonId}/complete`)
      setLesson((prev) => (prev ? { ...prev, completed: true } : null))
      toast.success("Lesson marked as completed!")
    } catch (err: any) {
      console.error("Failed to mark lesson completed:", err)
      toast.error(err.response?.data?.message || "Failed to mark lesson completed.")
    } finally {
      setIsMarkingCompleted(false)
    }
  }

  if (isLoadingAuth || isLoadingLesson) {
    return (
      <div className="flex justify-center items-center flex-1">
        <Loader2 className="h-8 w-8 animate-spin text-primary-purple" />
        <span className="ml-2 text-lg">Loading lesson...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center flex-1 text-red-500">
        <p>{error}</p>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="flex justify-center items-center flex-1 text-gray-600 dark:text-gray-300">
        <p className="text-xl">Lesson not found.</p>
      </div>
    )
  }

  return (
    <Card className="flex-1 bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary-purple">{lesson.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {authMethod === "firebase" && !token && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md dark:bg-yellow-900 dark:border-yellow-600 dark:text-yellow-200">
            <p className="font-bold">Limited Access</p>
            <p>
              You are logged in with email. Full functionality, including progress tracking and data persistence,
              requires connecting your MetaMask wallet.
            </p>
          </div>
        )}
        {lesson.type === "video" && (
          <div className="aspect-video w-full bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500">
            <p>Video Player Placeholder: {lesson.content}</p>
            {/* In a real app, you'd embed a video player here */}
          </div>
        )}
        {lesson.type === "text" && (
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown>{lesson.content}</ReactMarkdown>
          </div>
        )}
        {lesson.type === "code" && (
          <div className="bg-gray-900 text-white p-4 rounded-md font-mono text-sm overflow-x-auto">
            <pre>
              <code>{lesson.content}</code>
            </pre>
          </div>
        )}
        {lesson.type === "quiz" && (
          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-md text-primary-blue dark:text-blue-200">
            <p className="font-semibold">Quiz Link:</p>
            <Link href={`/quizzes/${lesson.content}`} className="underline hover:no-underline">
              Start Quiz: {lesson.content}
            </Link>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        {!lesson.completed && (
          <Button
            onClick={markLessonCompleted}
            disabled={isMarkingCompleted || !token} // Disable if no token
            className="bg-primary-purple hover:bg-primary-purple/90 text-white"
          >
            {isMarkingCompleted && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mark as Completed
          </Button>
        )}
        {lesson.completed && (
          <Button disabled variant="outline" className="text-success border-success bg-transparent">
            Completed
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
