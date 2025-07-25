"use client"

import { Progress } from "@/components/ui/progress"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import type { Quiz } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import api from "@/lib/api" // Import api

export function QuizList() {
  const { user, firebaseUser, isLoadingAuth, authMethod, token } = useAuth() // Check token for access
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoadingAuth && !user && !firebaseUser) {
      // Allow either MetaMask or Firebase user
      toast.error("Please login to view quizzes.")
      router.push("/")
      return
    }

    const fetchQuizzes = async () => {
      setIsLoadingQuizzes(true)
      setError(null)
      try {
        // --- ORIGINAL API CALL (UNCOMMENT WHEN BACKEND IS READY) ---
        const response = await api.get<Quiz[]>("/api/quizzes")
        setQuizzes(response.data)
        // --- ORIGINAL API CALL (UNCOMMENT WHEN BACKEND IS READY) ---
      } catch (err: any) {
        console.error("Failed to fetch quizzes:", err)
        setError(err.response?.data?.message || "Failed to load quizzes.")
        toast.error(err.response?.data?.message || "Failed to load quizzes.")
      } finally {
        setIsLoadingQuizzes(false) // Handled by setTimeout
      }
    }

    if (user || firebaseUser) {
      // Fetch if either user type is logged in
      fetchQuizzes()
    }
  }, [user, firebaseUser, isLoadingAuth, router, token])

  const getDifficultyColor = (difficulty: Quiz["difficulty"]) => {
    switch (difficulty) {
      case "Easy":
        return "bg-success text-white"
      case "Medium":
        return "bg-warning text-white"
      case "Hard":
        return "bg-destructive text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  if (isLoadingAuth || isLoadingQuizzes) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-purple" />
        <span className="ml-2 text-lg">Loading quizzes...</span>
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

  if (quizzes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-gray-600 dark:text-gray-300">
        <p className="text-xl mb-4">No quizzes available yet.</p>
        <p>Check back later for new challenges!</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {authMethod === "firebase" && !token && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-md dark:bg-yellow-900 dark:border-yellow-600 dark:text-yellow-200">
          <p className="font-bold">Limited Access</p>
          <p>
            You are logged in with email. Full functionality, including quiz progress and persistence, requires
            connecting your MetaMask wallet.
          </p>
        </div>
      )}
      <h1 className="text-3xl font-bold text-primary-purple mb-8 text-center">Available Quizzes</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
          <Card
            key={quiz.id}
            className="bg-white shadow-md rounded-lg overflow-hidden dark:bg-gray-800 dark:text-gray-100"
          >
            <CardHeader>
              <CardTitle className="text-xl font-semibold">{quiz.title}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge className={getDifficultyColor(quiz.difficulty)}>{quiz.difficulty}</Badge>
                <Badge variant="secondary">{quiz.topic}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {quiz.recent_performance !== undefined && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span>Recent Performance</span>
                    <span>{quiz.recent_performance}%</span>
                  </div>
                  <Progress value={quiz.recent_performance} className="h-2" />
                </div>
              )}
              <Link href={`/quizzes/${quiz.id}`}>
                <Button className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white">Take Quiz</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
