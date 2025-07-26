"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import type { Lesson } from "@/lib/types"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Play, BookOpen, Clock } from "lucide-react"
import ReactMarkdown from "react-markdown"

interface LessonViewerProps {
  courseId: string
  lessonId: string
}

interface LessonData {
  id: string
  title: string
  type: string
  video_url: string
  embed_url: string
  duration: string
  description: string
  content: string
  course_id: string
  completed?: boolean
}

export function LessonViewer({ courseId, lessonId }: LessonViewerProps) {
  const { user, firebaseUser, isLoadingAuth, authMethod, token } = useAuth()
  const router = useRouter()
  const [lesson, setLesson] = useState<LessonData | null>(null)
  const [isLoadingLesson, setIsLoadingLesson] = useState(true)
  const [isMarkingCompleted, setIsMarkingCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoadingAuth && !user && !firebaseUser) {
      toast.error("Please login to view lessons.")
      router.push("/")
      return
    }

    const fetchLesson = async () => {
      setIsLoadingLesson(true)
      setError(null)
      try {
        console.log(`Fetching lesson: ${courseId}/${lessonId}`) // Debug log
        
        const response = await fetch(`http://127.0.0.1:5000/api/courses/${courseId}/lessons/${lessonId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Add auth header if token exists
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch lesson: ${response.status}`)
        }

        const lessonData = await response.json()
        console.log('Lesson data received:', lessonData) // Debug log
        setLesson(lessonData)
        
      } catch (err: any) {
        console.error("Failed to fetch lesson:", err)
        setError(err.message || "Failed to load lesson.")
        toast.error(err.message || "Failed to load lesson.")
      } finally {
        setIsLoadingLesson(false)
      }
    }

    if (user || firebaseUser) {
      fetchLesson()
    }
  }, [user, firebaseUser, isLoadingAuth, router, courseId, lessonId, token])

  const markLessonCompleted = async () => {
    if (!lesson || lesson.completed || !token) {
      toast.error("Please connect your MetaMask wallet to mark lessons as completed.")
      return
    }
    setIsMarkingCompleted(true)
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/courses/${courseId}/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setLesson((prev) => (prev ? { ...prev, completed: true } : null))
        toast.success("Lesson marked as completed!")
      } else {
        throw new Error('Failed to mark lesson as completed')
      }
    } catch (err: any) {
      console.error("Failed to mark lesson completed:", err)
      toast.error("Failed to mark lesson completed.")
    } finally {
      setIsMarkingCompleted(false)
    }
  }

  // Fixed: Function to render markdown-like content with proper string handling
  const renderContent = (content: string) => {
    const lines = content.split('\n')
    const result = []
    let inCodeBlock = false
    let codeBlockContent: string[] = []
    
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index]
      
      // Handle code blocks properly
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          // Opening code block
          inCodeBlock = true
          codeBlockContent = []
        } else {
          // Closing code block - render accumulated content
          inCodeBlock = false
          result.push(
            <div key={`code-${index}`} className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mt-4 mb-4 overflow-x-auto">
              <div className="flex items-center mb-3">
                <span className="text-white font-semibold">💻 Code Example:</span>
              </div>
              <pre className="text-sm">
                <code>{codeBlockContent.join('\n')}</code>
              </pre>
            </div>
          )
          codeBlockContent = []
        }
        continue
      }
      
      // If we're inside a code block, accumulate content
      if (inCodeBlock) {
        codeBlockContent.push(line)
        continue
      }
      
      // Handle other markdown elements
      if (line.startsWith('# ')) {
        result.push(
          <h1 key={index} className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            {line.substring(2)}
          </h1>
        )
      } else if (line.startsWith('## ')) {
        result.push(
          <h2 key={index} className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200 mt-6">
            {line.substring(3)}
          </h2>
        )
      } else if (line.startsWith('- ')) {
        result.push(
          <li key={index} className="ml-4 text-gray-700 dark:text-gray-300 list-disc">
            {line.substring(2)}
          </li>
        )
      } else if (line.trim() === '') {
        result.push(<br key={index} />)
      } else if (line.trim() !== '') {
        result.push(
          <p key={index} className="text-gray-700 dark:text-gray-300 mb-2">
            {line}
          </p>
        )
      }
    }
    
    return result
  }

  if (isLoadingAuth || isLoadingLesson) {
    return (
      <div className="flex justify-center items-center flex-1 min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-purple" />
        <span className="ml-2 text-lg">Loading lesson...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center flex-1 text-red-500">
        <div className="text-center">
          <p className="text-xl mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry Loading
          </Button>
        </div>
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
    <div className="flex-1 space-y-6">
      {/* Lesson Header Card */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold mb-2">{lesson.title}</CardTitle>
          {lesson.description && (
            <p className="text-blue-100 mb-4">{lesson.description}</p>
          )}
          <div className="flex items-center space-x-4 flex-wrap">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm flex items-center">
              {lesson.type === 'video' ? <Play className="w-4 h-4 mr-1" /> : <BookOpen className="w-4 h-4 mr-1" />}
              {lesson.type === 'video' ? 'Video Lesson' : lesson.type === 'code' ? 'Coding Exercise' : 'Reading'}
            </span>
            {lesson.duration && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {lesson.duration}
              </span>
            )}
            {lesson.completed && (
              <span className="bg-green-500 px-3 py-1 rounded-full text-sm">
                ✅ Completed
              </span>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Authentication Warning */}
      {authMethod === "firebase" && !token && (
        <Card className="bg-yellow-50 border-l-4 border-yellow-500 dark:bg-yellow-900">
          <CardContent className="pt-6">
            <p className="font-bold text-yellow-700 dark:text-yellow-200">Limited Access</p>
            <p className="text-yellow-700 dark:text-yellow-200">
              You are logged in with email. Full functionality, including progress tracking and data persistence,
              requires connecting your MetaMask wallet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Video Player */}
      {lesson.type === "video" && lesson.embed_url && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Play className="w-5 h-5 mr-2" />
              Video Tutorial
            </h3>
            <div className="aspect-video rounded-lg overflow-hidden shadow-lg bg-gray-100">
              <iframe
                src={lesson.embed_url}
                title={lesson.title}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                style={{ border: 'none' }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lesson Content */}
      <Card className="bg-white shadow-md rounded-lg dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-primary-purple flex items-center">
            <BookOpen className="w-5 h-5 mr-2" />
            Lesson Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {lesson.type === "text" && (
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown>{lesson.content}</ReactMarkdown>
            </div>
          )}
          
          {lesson.type === "video" && lesson.content && (
            <div className="prose dark:prose-invert max-w-none">
              <div className="space-y-2">
                {renderContent(lesson.content)}
              </div>
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
        
        <CardFooter className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Course: {lesson.course_id} | Lesson: {lesson.id}
          </div>
          <div className="flex space-x-2">
            {!lesson.completed && (
              <Button
                onClick={markLessonCompleted}
                disabled={isMarkingCompleted || !token}
                className="bg-primary-purple hover:bg-primary-purple/90 text-white"
              >
                {isMarkingCompleted && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mark as Completed
              </Button>
            )}
            {lesson.completed && (
              <Button disabled variant="outline" className="text-green-600 border-green-600 bg-transparent">
                ✅ Completed
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Practice Section for Learning */}
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold mb-3 text-green-700">🚀 Practice Exercise</h3>
          <p className="text-gray-700 dark:text-gray-300">
            Try modifying the code examples! Experiment with:
          </p>
          <ul className="list-disc list-inside mt-2 text-gray-700 dark:text-gray-300 space-y-1">
            <li>Changing colors and shapes</li>
            <li>Adding your own creative elements</li>
            <li>Exploring different programming concepts</li>
            <li>Building upon what you&apos;ve learned</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}