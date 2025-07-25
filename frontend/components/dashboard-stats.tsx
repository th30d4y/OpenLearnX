"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/router"
import { toast } from "react-hot-toast"
import type { DashboardStats, ActivityData } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Award, BookOpen, Code, CheckCircle2, TrendingUp } from "lucide-react"
import api from "@/lib/api"

export function DashboardStatsOverview() {
  const { user, firebaseUser, isLoadingAuth, authMethod, token } = useAuth() // Check token for access
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<ActivityData[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoadingAuth && !user && !firebaseUser) {
      // Allow either MetaMask or Firebase user
      toast.error("Please login to view your dashboard.")
      router.push("/")
      return
    }

    const fetchDashboardData = async () => {
      setIsLoadingData(true)
      setError(null)
      try {
        // --- ORIGINAL API CALLS (UNCOMMENT WHEN BACKEND IS READY) ---
        const statsResponse = await api.get<DashboardStats>("/api/dashboard/stats")
        setStats(statsResponse.data)

        const activityResponse = await api.get<ActivityData[]>("/api/dashboard/activity")
        setActivity(activityResponse.data)
      } catch (err: any) {
        console.error("Failed to fetch dashboard data:", err)
        setError(err.response?.data?.message || "Failed to load dashboard data.")
        toast.error(err.response?.data?.message || "Failed to load dashboard data.")
      } finally {
        setIsLoadingData(false) // Handled by setTimeout
      }
    }

    if (user || firebaseUser) {
      // Only fetch if either user type is logged in
      fetchDashboardData()
    }
  }, [user, firebaseUser, isLoadingAuth, router, token])

  if (isLoadingAuth || isLoadingData) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-purple" />
        <span className="ml-2 text-lg">Loading dashboard...</span>
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

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-gray-600 dark:text-gray-300">
        <p className="text-xl mb-4">No dashboard data available.</p>
        <p>Start learning to see your progress!</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {authMethod === "firebase" && !token && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-md dark:bg-yellow-900 dark:border-yellow-600 dark:text-yellow-200">
          <p className="font-bold">Limited Access</p>
          <p>
            You are logged in with email. Full functionality, including personalized stats and activity tracking,
            requires connecting your MetaMask wallet.
          </p>
        </div>
      )}
      <h1 className="text-3xl font-bold text-primary-purple mb-8 text-center">Your Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total XP</CardTitle>
            <Award className="h-4 w-4 text-primary-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_xp}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Accumulated experience points</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses Completed</CardTitle>
            <BookOpen className="h-4 w-4 text-primary-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.courses_completed}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Courses you've finished</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Problems Solved</CardTitle>
            <Code className="h-4 w-4 text-primary-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.coding_problems_solved}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Coding challenges mastered</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quiz Accuracy</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.quiz_accuracy.toFixed(1)}%</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Overall quiz performance</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coding Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.coding_streak} days</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Consecutive days coding</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-bold text-primary-purple mb-6 text-center">Activity Heatmap (Coming Soon)</h2>
      <Card className="bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100 mb-8">
        <CardContent className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <p>Interactive activity heatmap visualization will appear here.</p>
        </CardContent>
      </Card>

      <h2 className="text-2xl font-bold text-primary-purple mb-6 text-center">
        Strengths/Weaknesses & Leaderboard (Coming Soon)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100">
          <CardContent className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <p>Radar chart for strengths/weaknesses will appear here.</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100">
          <CardContent className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <p>Global leaderboard will appear here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
