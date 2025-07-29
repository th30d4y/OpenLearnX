"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "react-hot-toast"
import { useAuth } from "@/context/auth-context"
import api from "@/lib/api"
import { CourseSidebar } from "@/components/course-sidebar"
import { LessonViewer } from "@/components/lesson-viewer"
import { Loader2 } from "lucide-react"

interface Course {
  id: string
  title: string
  subject: string
  description: string
  difficulty: string
  mentor: string
  video_url: string
  embed_url: string
  students: number
  created_at: string
}

interface Module {
  id: string
  course_id: string
  title: string
  description: string
  order: number
  created_at?: string
}

interface Lesson {
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
  created_at?: string
}

export default function LessonDetailPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params?.courseId ?? ''
  const lessonId = params?.lessonId ?? ''
  const { user, firebaseUser, isLoading: isAuthLoading } = useAuth()

  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [lessons, setLessons] = useState<{ [moduleId: string]: Lesson[] }>({})
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthLoading && !user && !firebaseUser) {
      toast.error("Please login to view lessons.")
      router.replace("/")
      return
    }

    if ((user || firebaseUser) && courseId) {
      fetchCourseData()
    }
  }, [user, firebaseUser, isAuthLoading, router, courseId])

  const fetchCourseData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Fetching course data for:', courseId)
      
      // Fetch course details
      const courseResponse = await api.get<Course>(`/api/courses/${courseId}?t=${Date.now()}`)
      const courseData = courseResponse.data
      console.log('✅ Course data loaded:', courseData)
      setCourse(courseData)

      // Fetch modules for the course
      const modulesResponse = await fetch(`http://127.0.0.1:5000/api/courses/${courseId}/modules`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (modulesResponse.ok) {
        const modulesData = await modulesResponse.json()
        console.log('✅ Modules data loaded:', modulesData)
        
        let modulesList: Module[] = []
        if (modulesData.modules && Array.isArray(modulesData.modules)) {
          modulesList = modulesData.modules
        } else if (Array.isArray(modulesData)) {
          modulesList = modulesData
        }
        
        setModules(modulesList)
        
        // Fetch lessons for all modules
        const lessonsData: { [moduleId: string]: Lesson[] } = {}
        let foundCurrentLesson: Lesson | null = null
        
        for (const module of modulesList) {
          const lessonsResponse = await fetch(`http://127.0.0.1:5000/api/modules/${module.id}/lessons`, {
            headers: {
              'Content-Type': 'application/json'
            }
          })
          
          if (lessonsResponse.ok) {
            const lessonData = await lessonsResponse.json()
            console.log(`✅ Lessons loaded for module ${module.id}:`, lessonData)
            
            let lessonsList: Lesson[] = []
            if (lessonData.lessons && Array.isArray(lessonData.lessons)) {
              lessonsList = lessonData.lessons
            } else if (Array.isArray(lessonData)) {
              lessonsList = lessonData
            }
            
            lessonsData[module.id] = lessonsList
            
            // Find the current lesson
            if (lessonId && !foundCurrentLesson) {
              foundCurrentLesson = lessonsList.find(lesson => lesson.id === lessonId) || null
            }
          }
        }
        
        setLessons(lessonsData)
        
        if (foundCurrentLesson) {
          setCurrentLesson(foundCurrentLesson)
          console.log('✅ Current lesson found:', foundCurrentLesson)
        } else if (lessonId) {
          console.log('❌ Lesson not found:', lessonId)
          toast.error("Lesson not found")
          router.replace(`/courses/${courseId}`)
        }
      } else {
        throw new Error('Failed to fetch modules')
      }
      
    } catch (err: any) {
      console.error('❌ Error fetching course data:', err)
      setError(err.message || "Failed to load course.")
      toast.error(err.message || "Failed to load course.")
    } finally {
      setLoading(false)
    }
  }

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
      <div className="flex flex-col justify-center items-center min-h-screen bg-white text-red-600">
        <p className="text-lg mb-4">{error}</p>
        <button 
          onClick={() => router.back()}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Go Back
        </button>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-white text-gray-700">
        <p className="text-lg mb-4">Course not found.</p>
        <button 
          onClick={() => router.push('/courses')}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Browse Courses
        </button>
      </div>
    )
  }

  if (!currentLesson) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-white text-gray-700">
        <p className="text-lg mb-4">Lesson not found.</p>
        <button 
          onClick={() => router.push(`/courses/${courseId}`)}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Back to Course
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <CourseSidebar 
        courseId={course.id} 
        modules={modules}
        lessons={lessons}
        activeLessonId={lessonId}
        currentLesson={currentLesson}
      />
      <main className="flex-grow p-8 max-w-4xl mx-auto w-full">
        <LessonViewer 
          courseId={course.id} 
          lessonId={lessonId}
          lesson={currentLesson}
          course={course}
        />
      </main>
    </div>
  )
}
