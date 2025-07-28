// frontend/components/dashboard-stats.tsx - ONLY REAL DATA
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Trophy, BookOpen, Code, CheckCircle2, Wallet, Shield, 
  Activity, Target, Timer, Award, Zap, Globe, User, 
  BarChart3, Flame, Brain, Loader2, AlertCircle
} from "lucide-react"
import { UsernameSetup } from "./UsernameSetup"
import api from "@/lib/api"

interface DashboardStats {
  total_xp: number
  courses_completed: number
  coding_problems_solved: number
  quiz_accuracy: number
  coding_streak: number
  longest_streak: number
  total_courses: number
  total_quizzes: number
  global_rank: number
  weekly_activity: number[]
  monthly_goals: { target: number; completed: number }
  blockchain: {
    wallet_connected: boolean
    wallet_address: string
    total_earned: number
    transactions: number
    certificates: number
    verified_achievements: number
  }
  learning_analytics: {
    time_spent_hours: number
    average_session_minutes: number
    completion_rate: number
    favorite_topics: string[]
    skill_levels: { [key: string]: number }
  }
  recent_achievements: Array<{
    id: string
    title: string
    description: string
    earned_at: string
    points: number
    rarity: string
  }>
}

interface UserProfile {
  user_id: string
  wallet_address?: string
  display_name?: string
  username_set?: boolean
  avatar_url?: string
  created_at: string
}

interface ActivityData {
  id: string
  type: string
  title: string
  description: string
  completed_at: string
  points_earned: number
  blockchain_verified?: boolean
}

interface LeaderboardEntry {
  rank: number
  user_id: string
  username: string
  display_name?: string
  total_xp: number
  streak: number
  avatar?: string
  wallet_address?: string
}

export function DashboardStatsOverview() {
  const { walletAddress, walletConnected, isLoadingAuth } = useAuth()
  const router = useRouter()
  
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [activity, setActivity] = useState<ActivityData[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [usernameRequired, setUsernameRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoadingAuth && !walletConnected) {
      toast.error("Please connect your MetaMask wallet to view dashboard.")
      router.push("/auth/login")
      return
    }

    if (walletConnected && walletAddress) {
      fetchPureMongoDBData()
    }
  }, [walletConnected, walletAddress, isLoadingAuth, router])

  const fetchPureMongoDBData = async () => {
    setIsLoadingData(true)
    setError(null)
    
    try {
      console.log('📊 Fetching PURE MongoDB data for wallet:', walletAddress)
      
      const [statsRes, activityRes, leaderboardRes] = await Promise.all([
        api.get<{
          success: boolean
          data?: DashboardStats
          user_profile: UserProfile
          username_required?: boolean
          data_source: string
          message?: string
        }>("/api/dashboard/comprehensive-stats"),
        api.get<{success: boolean, data: ActivityData[], data_source: string}>("/api/dashboard/recent-activity"), 
        api.get<{success: boolean, data: LeaderboardEntry[], data_source: string}>("/api/dashboard/global-leaderboard")
      ])

      // ✅ VERIFY DATA SOURCE IS PURE MONGODB
      if (statsRes.data.data_source !== "pure_mongodb_data" && statsRes.data.data_source !== "empty_real_data") {
        console.error("❌ Data source is not pure MongoDB:", statsRes.data.data_source)
        toast.error("Invalid data source detected. Refreshing...")
        return
      }

      if (statsRes.data.success) {
        if (statsRes.data.username_required) {
          setUsernameRequired(true)
          setUserProfile(statsRes.data.user_profile)
          setIsLoadingData(false)
          return
        }
        
        setStats(statsRes.data.data || null)
        setUserProfile(statsRes.data.user_profile)
        setUsernameRequired(false)
        
        console.log('✅ Pure MongoDB data loaded for user:', statsRes.data.user_profile?.display_name)
        console.log('📊 Data source verified:', statsRes.data.data_source)
      }
      
      if (activityRes.data.success && activityRes.data.data_source === "pure_mongodb_data") {
        setActivity(activityRes.data.data)
        console.log('✅ Real activity loaded:', activityRes.data.data.length, 'items')
      }
      
      if (leaderboardRes.data.success && leaderboardRes.data.data_source === "pure_mongodb_data") {
        setLeaderboard(leaderboardRes.data.data)
        console.log('✅ Real leaderboard loaded:', leaderboardRes.data.data.length, 'users')
      }

    } catch (err: any) {
      console.error("Failed to fetch pure MongoDB data:", err)
      setError(err.response?.data?.message || "Failed to load dashboard data.")
      
      if (err.response?.status === 401) {
        toast.error("MetaMask authentication required.")
        router.push("/auth/login")
      } else {
        toast.error("Failed to load real dashboard data.")
        setStats(null)
        setActivity([])
        setLeaderboard([])
      }
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleUsernameSet = (profile: UserProfile) => {
    setUserProfile(profile)
    setUsernameRequired(false)
    fetchPureMongoDBData()
  }

  const formatTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'Just now'
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
      case 'epic': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
      case 'rare': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
    }
  }

  // Loading state
  if (isLoadingAuth || isLoadingData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Loading Pure MongoDB Data
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Fetching your real learning progress from database...
            </p>
            {walletAddress && (
              <p className="text-xs text-purple-600 dark:text-purple-400 font-mono">
                🦊 {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Username setup required
  if (usernameRequired && userProfile) {
    return (
      <UsernameSetup 
        userProfile={userProfile} 
        onUsernameSet={handleUsernameSet}
      />
    )
  }

  // Empty state - no real data
  if (!stats && userProfile) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center py-16">
          <div className="mb-6">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Learning Data Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start your learning journey to see real analytics here!
            </p>
            
            {/* Show user profile info */}
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg mb-6 max-w-md mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {userProfile.display_name || 'New Learner'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    🦊 {userProfile.wallet_address?.slice(0, 6)}...{userProfile.wallet_address?.slice(-4)}
                  </p>
                  <p className="text-xs text-green-600">
                    ✅ Ready for learning - Pure MongoDB tracking
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-x-4">
            <Button onClick={() => router.push('/courses')} className="mr-4">
              <BookOpen className="w-4 h-4 mr-2" />
              Browse Courses
            </Button>
            <Button variant="outline" onClick={() => router.push('/quizzes')}>
              <Brain className="w-4 h-4 mr-2" />
              Take a Quiz
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (!stats) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center py-16">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Unable to Load Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please ensure your MetaMask wallet is connected and try again.
          </p>
          <Button onClick={fetchPureMongoDBData}>
            <Globe className="w-4 h-4 mr-2" />
            Retry Loading
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header with Real User Info */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src={userProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.user_id || 'default'}`}
                  alt="User Avatar"
                  className="w-12 h-12 rounded-full border-2 border-purple-600"
                />
                {stats.coding_streak > 0 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                    <Flame className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Welcome, {userProfile?.display_name || 'Learner'}! 🦊
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Your real learning progress from MongoDB
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs font-mono">
                    🦊 {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                  </Badge>
                  <Badge variant="default" className="text-xs bg-green-600">
                    ✅ Pure MongoDB Data
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="px-3 py-1">
              <Globe className="w-4 h-4 mr-1" />
              Rank #{stats.global_rank.toLocaleString()}
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              <Zap className="w-4 h-4 mr-1" />
              {stats.total_xp.toLocaleString()} XP
            </Badge>
            <Badge variant="default" className="px-3 py-1 bg-purple-600">
              <Wallet className="w-4 h-4 mr-1" />
              MetaMask Verified
            </Badge>
          </div>
        </div>
      </div>

      {/* Real Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Coding Streak */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Real Coding Streak</CardTitle>
            <Flame className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {stats.coding_streak}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Best: {stats.longest_streak} days
            </p>
            <div className="mt-2">
              <Progress 
                value={stats.longest_streak > 0 ? (stats.coding_streak / stats.longest_streak) * 100 : 0} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Course Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Real Course Progress</CardTitle>
            <BookOpen className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.courses_completed}/{stats.total_courses}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {stats.total_courses > 0 ? Math.round((stats.courses_completed / stats.total_courses) * 100) : 0}% completed
            </p>
            <div className="mt-2">
              <Progress 
                value={stats.total_courses > 0 ? (stats.courses_completed / stats.total_courses) * 100 : 0} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Problem Solving */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Real Problems Solved</CardTitle>
            <Code className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {stats.coding_problems_solved}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {stats.learning_analytics.completion_rate.toFixed(1)}% success rate
            </p>
            <Badge variant="outline" className="text-xs mt-1">
              <Shield className="w-3 h-3 mr-1" />
              MongoDB Verified
            </Badge>
          </CardContent>
        </Card>

        {/* Quiz Performance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Real Quiz Accuracy</CardTitle>
            <Brain className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {stats.quiz_accuracy.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {stats.total_quizzes} real quizzes completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real Learning Analytics */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Real Learning Analytics from MongoDB
            <Badge variant="outline" className="text-xs ml-2">
              100% Authentic Data
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Time Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Timer className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">
                {stats.learning_analytics.time_spent_hours}h
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Real Time Spent</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">
                {stats.learning_analytics.average_session_minutes}m
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Session</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">
                {stats.learning_analytics.completion_rate.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Real Completion Rate</p>
            </div>
          </div>

          {/* Real Skill Levels */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Real Skill Progression from MongoDB</h4>
            {Object.entries(stats.learning_analytics.skill_levels).map(([skill, level]) => (
              <div key={skill} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{skill}</span>
                  <span className="text-gray-600 dark:text-gray-400">{level}%</span>
                </div>
                <Progress value={level} className="h-2" />
              </div>
            ))}
          </div>

          {/* Real Weekly Activity */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Real Weekly Activity Pattern</h4>
            <div className="flex items-end space-x-2 h-24">
              {stats.weekly_activity.map((activity, index) => {
                const maxActivity = Math.max(...stats.weekly_activity) || 1
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-gradient-to-t from-purple-600 to-cyan-500 rounded-t-sm transition-all duration-300 hover:from-purple-700 hover:to-cyan-600"
                      style={{ height: `${(activity / maxActivity) * 100}%` }}
                      title={`${activity} real activities`}
                    />
                    <span className="text-xs text-gray-500 mt-1">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real Recent Activity */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Real Activity History from MongoDB
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length > 0 ? (
            <div className="space-y-4">
              {activity.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 rounded-lg border bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 hover:shadow-md transition-shadow">
                  <div className={`p-2 rounded-lg ${
                    item.type === 'course' ? 'bg-blue-100 dark:bg-blue-900/30' :
                    item.type === 'quiz' ? 'bg-green-100 dark:bg-green-900/30' :
                    item.type === 'coding' ? 'bg-purple-100 dark:bg-purple-900/30' :
                    'bg-yellow-100 dark:bg-yellow-900/30'
                  }`}>
                    {item.type === 'course' && <BookOpen className="w-4 h-4 text-blue-600" />}
                    {item.type === 'quiz' && <Brain className="w-4 h-4 text-green-600" />}
                    {item.type === 'coding' && <Code className="w-4 h-4 text-purple-600" />}
                    {item.type === 'achievement' && <Award className="w-4 h-4 text-yellow-600" />}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">{item.title}</h4>
                      {item.blockchain_verified && (
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(item.completed_at)}
                      </span>
                      <span className="text-xs font-medium text-green-600">
                        +{item.points_earned} XP
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No real activity found in MongoDB</p>
              <p className="text-xs">Start learning to see your authentic activity here!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real Global Leaderboard */}
      {leaderboard.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Real Global Leaderboard from MongoDB
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboard.slice(0, 10).map((entry) => (
                <div key={entry.user_id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      entry.rank === 1 ? 'bg-yellow-500 text-white' :
                      entry.rank === 2 ? 'bg-gray-400 text-white' :
                      entry.rank === 3 ? 'bg-amber-600 text-white' :
                      'bg-gray-200 text-gray-700'
                    }`}>
                      {entry.rank}
                    </div>
                    <img 
                      src={entry.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user_id}`}
                      alt={entry.username}
                      className="w-8 h-8 rounded-full"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{entry.display_name || entry.username}</span>
                      {entry.wallet_address && (
                        <Badge variant="outline" className="text-xs">
                          🦊 Real User
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {entry.user_id.slice(0, 8)}...{entry.user_id.slice(-4)}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-purple-600">{entry.total_xp.toLocaleString()} Real XP</div>
                    <div className="text-xs text-gray-500">{entry.streak} day streak</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
