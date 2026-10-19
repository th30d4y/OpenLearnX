"use client"

import { useAuth } from "@/context/auth-context"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { 
  User, 
  Settings,
  Trophy, 
  BookOpen, 
  Target, 
  TrendingUp,
  Wallet,
  Mail,
  Calendar,
  Award,
  BarChart3,
  Activity,
  Edit3,
  Save,
  X,
  Loader2,
  Link2,
  ExternalLink,
  Flame,
  Upload
} from "lucide-react"
import api from "@/lib/api"

type ActivityData = {
  id: string
  type: string
  title: string
  description: string
  completed_at: string
  timestamp_utc?: string
  points_earned?: number
}

type CertificateItem = {
  certificate_id: string
  course_title: string
  completion_date: string
  instructor_name?: string
  mentor_name?: string
  public_url?: string
  unique_url?: string
}

export default function DashboardPage() {
  const { user, walletConnected, authMethod } = useAuth()
  const router = useRouter()
  const normalizedRole = String(user?.role || 'student').toLowerCase()
  const roleLabel = normalizedRole === 'admin' ? 'Admin' : normalizedRole === 'instructor' ? 'Instructor' : 'Student'
  const roleBadgeClass =
    normalizedRole === 'admin'
      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
      : normalizedRole === 'instructor'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isEditingSocial, setIsEditingSocial] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [showAllActivities, setShowAllActivities] = useState(false)
  const [recentActivity, setRecentActivity] = useState<ActivityData[]>([])
  const [certificates, setCertificates] = useState<CertificateItem[]>([])
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    avatar: user?.avatar || ''
  })
  const [socialData, setSocialData] = useState({
    github: '',
    linkedin: '',
    twitter: ''
  })
  
  const [stats, setStats] = useState({
    coursesCompleted: 0,
    totalXP: 0,
    currentStreak: 0,
    bestStreak: 0,
    rank: 0,
    certificatesEarned: 0,
    hoursLearned: 0,
    lastActiveDate: new Date().toISOString()
  })

  // Fetch real stats from API
  useEffect(() => {
    if (!user) {
      router.replace("/auth/login")
      return
    }
    
    fetchRealStats()
  }, [user, router])

  const fetchRealStats = async () => {
    setIsLoadingStats(true)
    try {
      const [statsResult, activityResult] = await Promise.allSettled([
        api.get("/api/dashboard/comprehensive-stats"),
        api.get("/api/dashboard/recent-activity"),
      ])

      if (statsResult.status === "fulfilled" && statsResult.value.data.success && statsResult.value.data.data) {
        const data = statsResult.value.data.data
        const streakData = data.streak_data || {}
        setStats({
          coursesCompleted: data.courses_completed || 0,
          totalXP: data.total_xp || 0,
          currentStreak: streakData.current_streak || 0,
          bestStreak: streakData.best_streak || 0,
          rank: data.global_rank || 0,
          certificatesEarned: data.blockchain?.certificates || 0,
          hoursLearned: Math.round(data.learning_analytics?.time_spent_hours || 0),
          lastActiveDate: data.last_active_date || new Date().toISOString()
        })
      }

      if (activityResult.status === "fulfilled" && activityResult.value.data?.success && Array.isArray(activityResult.value.data?.data)) {
        setRecentActivity(activityResult.value.data.data)
      }

      if (user?.id) {
        const certUserId = user.wallet_address || user.id
        try {
          const certResponse = await api.get(`/api/certificate/user/${certUserId}`)
          if (certResponse.data?.success && Array.isArray(certResponse.data?.certificates)) {
            setCertificates(certResponse.data.certificates)
          } else if (Array.isArray(certResponse.data)) {
            setCertificates(certResponse.data)
          }
        } catch {
          // Ignore certificate fetch errors.
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch dashboard stats:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setIsLoadingStats(false)
    }
  }

  const handleSettingsClick = () => {
    setIsEditingSocial(false)
    setIsEditingProfile(true)
    const el = document.getElementById("profile-card")
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const activityIconConfig = (activityType: string) => {
    const t = String(activityType || "").toLowerCase()
    if (t.includes("course")) return { icon: BookOpen, bgColor: "bg-green-100", textColor: "text-green-600" }
    if (t.includes("quiz")) return { icon: Award, bgColor: "bg-blue-100", textColor: "text-blue-600" }
    if (t.includes("streak")) return { icon: Flame, bgColor: "bg-orange-100", textColor: "text-orange-600" }
    if (t.includes("rank")) return { icon: TrendingUp, bgColor: "bg-purple-100", textColor: "text-purple-600" }
    if (t.includes("account") || t.includes("auth")) return { icon: Settings, bgColor: "bg-indigo-100", textColor: "text-indigo-600" }
    return { icon: Activity, bgColor: "bg-slate-100", textColor: "text-slate-600" }
  }

  const isPlaceholderActivity = (item: ActivityData) => {
    const text = `${item.title || ""} ${item.description || ""}`.toLowerCase()
    const fakeMarkers = [
      "completed react fundamentals",
      "scored 95% on javascript quiz",
      "7-day learning streak achieved",
      "moved up 5 positions in leaderboard",
    ]
    return fakeMarkers.some((marker) => text.includes(marker))
  }

  const isEndpointText = (value: string) => /^(get|post|put|patch|delete)\s+\/api\//i.test(String(value || "").trim())

  const normalizeActivityForUI = (item: ActivityData): ActivityData | null => {
    const rawTitle = String(item.title || "")
    const rawDescription = String(item.description || "")
    const lower = `${rawTitle} ${rawDescription}`.toLowerCase()

    if (lower.includes("/api/auth/verify-token")) {
      return null
    }

    let title = rawTitle
    let description = rawDescription

    if (isEndpointText(rawTitle) || isEndpointText(rawDescription)) {
      if (lower.includes("/api/quizzes") && lower.includes("join-room")) {
        title = "Joined quiz room"
        description = "Entered a live quiz room"
      } else if (lower.includes("/api/quizzes") && (lower.includes("submit-answer") || lower.includes("/submit"))) {
        title = "Attempted quiz question"
        description = "Submitted a quiz answer"
      } else if ((lower.includes("/api/exam") || lower.includes("/api/coding")) && lower.includes("join-exam")) {
        title = "Joined coding exam"
        description = "Entered a coding exam"
      } else if ((lower.includes("/api/exam") || lower.includes("/api/coding")) && lower.includes("submit")) {
        title = "Submitted coding solution"
        description = "Submitted code for evaluation"
      } else if (lower.includes("/api/courses") && lower.includes("complete")) {
        title = "Completed lesson"
        description = "Marked lesson as completed"
      } else if (lower.includes("/api/courses")) {
        title = "Course activity"
        description = "Viewed or continued course learning"
      } else if (lower.includes("/api/auth")) {
        title = "Authentication activity"
        description = "Signed in to account"
      } else {
        title = "Learning activity"
        description = "Activity recorded"
      }
    }

    return {
      ...item,
      title,
      description,
    }
  }

  const realActivities = recentActivity
    .map((item) => normalizeActivityForUI(item))
    .filter((item): item is ActivityData => Boolean(item))
    .filter((item) => !isPlaceholderActivity(item))
  const visibleActivities = showAllActivities ? realActivities : realActivities.slice(0, 6)

  const handleProfileUpdate = async () => {
    try {
      const token = localStorage.getItem("openlearnx_jwt_token") || localStorage.getItem("openlearnx_token")
      if (!token) {
        toast.error("Not authenticated")
        return
      }

      const response = await api.post(
        "/api/auth/profile/update",
        {
          name: profileData.name,
          bio: profileData.bio,
          avatar: profileData.avatar
        },
        {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      )

      if (response.data.success) {
        setIsEditingProfile(false)
        toast.success("Profile updated successfully")
        // Update local user context if available
        console.log("Profile updated:", response.data.user)
      } else {
        toast.error(response.data.error || "Failed to update profile")
      }
    } catch (error: any) {
      console.error("Failed to update profile:", error)
      toast.error(error.response?.data?.error || "Failed to update profile")
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PNG and JPG formats are allowed')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setIsUploadingImage(true)
    try {
      const token = localStorage.getItem("openlearnx_jwt_token") || localStorage.getItem("openlearnx_token")
      if (!token) {
        toast.error("Not authenticated")
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post(
        "/api/auth/upload-image",
        formData,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        }
      )

      if (response.data.success) {
        setProfileData({
          ...profileData,
          avatar: response.data.image
        })
        toast.success("Image uploaded successfully")
      } else {
        toast.error(response.data.error || "Failed to upload image")
      }
    } catch (error: any) {
      console.error("Image upload error:", error)
      toast.error(error.response?.data?.error || "Failed to upload image")
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleSocialUpdate = async () => {
    try {
      // Here you would call your API to update social links
      // await updateSocialLinks(socialData)
      console.log("Social links updated:", socialData)
      toast.success("Social links updated successfully")
    } catch (error) {
      console.error("Failed to update social links:", error)
      toast.error("Failed to update social links")
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Dashboard sub-header */}
      <div className="border-b border-border bg-card">
        <div className="container flex items-center justify-between h-12">
          <h1 className="text-sm font-semibold text-foreground">Dashboard</h1>
          <button
            onClick={handleSettingsClick}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            title="Profile settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <main className="container py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-primary rounded-2xl p-8 text-primary-foreground shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  Welcome back
                </h2>
                <p className="text-primary-foreground/80 text-lg">
                  Ready to continue your learning journey?
                </p>
                {authMethod === "metamask" && user ? (
                  <div className="mt-3 flex items-center space-x-2">
                    <Wallet className="w-4 h-4 text-orange-300" />
                    <span className="text-sm text-primary-foreground/80">
                      Connected: {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClass}`}>
                      {roleLabel}
                    </span>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-blue-300" />
                    <span className="text-sm text-primary-foreground/80">
                      {user.email || user.id}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClass}`}>
                      {roleLabel}
                    </span>
                  </div>
                )}
              </div>
              <div className="hidden md:block">
                <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Trophy className="w-16 h-16 text-yellow-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isLoadingStats ? (
            // Loading skeleton
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-card rounded-2xl shadow-sm border border-border p-6 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                      <div className="h-8 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="bg-card rounded-2xl shadow-sm border border-border p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Total XP</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalXP.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-lg">
                <Trophy className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-sm text-green-600 font-medium">+12% from last week</span>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Courses</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.coursesCompleted}</p>
              </div>
              <div className="p-4 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl shadow-lg">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <Activity className="w-4 h-4 text-blue-500 mr-2" />
              <span className="text-sm text-blue-600 font-medium">3 in progress</span>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Streak</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.currentStreak} days</p>
              </div>
              <div className="p-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg">
                <Flame className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-sm text-orange-600 font-medium">Keep your streak going</span>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Global Rank</p>
                <p className="text-3xl font-bold text-foreground mt-1">#{stats.rank}</p>
              </div>
              <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <Award className="w-4 h-4 text-purple-500 mr-2" />
              <span className="text-sm text-purple-600 font-medium">Top 5% learner</span>
            </div>
          </div>
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card with Edit Functionality */}
          <div className="lg:col-span-1">
            <div id="profile-card" className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
              {/* Profile Tabs */}
              <div className="flex border-b border-gray-200 dark:border-border">
                <button
                  onClick={() => { setIsEditingProfile(false); setIsEditingSocial(false); }}
                  className={`flex-1 py-3 px-4 text-sm font-semibold transition-all ${
                    !isEditingSocial ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 bg-indigo-50 dark:bg-muted' : 'text-muted-foreground hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setIsEditingSocial(true)}
                  className={`flex-1 py-3 px-4 text-sm font-semibold transition-all ${
                    isEditingSocial ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 bg-indigo-50 dark:bg-muted' : 'text-muted-foreground hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Social Links
                </button>
              </div>

              <div className="p-6">
                {!isEditingSocial ? (
                  /* Profile Tab */
                  <>
                    <div className="text-center mb-6">
                      {profileData.avatar ? (
                        <img
                          src={profileData.avatar}
                          alt="Avatar"
                          className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-indigo-100 object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                          <User className="w-12 h-12 text-white" />
                        </div>
                      )}

                      {isEditingProfile ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={profileData.name}
                            onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                            placeholder="Your name"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-muted text-foreground placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                          />
                          
                          {/* Image Upload Input */}
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/png,image/jpeg"
                              onChange={handleImageUpload}
                              disabled={isUploadingImage}
                              className="hidden"
                              id="avatar-upload"
                            />
                            <label
                              htmlFor="avatar-upload"
                              className={`w-full flex items-center justify-center space-x-2 px-3 py-2 border-2 border-dashed border-indigo-300 dark:border-indigo-500 rounded-lg hover:bg-indigo-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                                isUploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {isUploadingImage ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                  <span className="text-sm text-indigo-600 dark:text-indigo-400">Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 text-indigo-600" />
                                  <span className="text-sm text-indigo-600 dark:text-indigo-400">Upload PNG/JPG</span>
                                </>
                              )}
                            </label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">Max 5MB (PNG or JPG only)</p>
                          </div>

                          <textarea
                            value={profileData.bio}
                            onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                            placeholder="Your bio"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-muted text-foreground placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center h-20 resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleProfileUpdate}
                              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 text-white rounded-lg transition-colors"
                            >
                              <Save className="w-4 h-4" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={() => setIsEditingProfile(false)}
                              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-muted text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <h4 className="text-lg font-semibold text-foreground">
                              {profileData.name || "Your Name"}
                            </h4>
                            <button
                              onClick={() => setIsEditingProfile(true)}
                              className="p-1 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">
                            {profileData.bio || "Add a bio to tell others about yourself"}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-800 rounded-xl border border-indigo-100 dark:border-gray-600">
                        <div className="flex items-center space-x-3">
                          {authMethod === "metamask" ? (
                            <Wallet className="w-6 h-6 text-orange-600" />
                          ) : (
                            <Mail className="w-6 h-6 text-blue-600" />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-foreground">Auth Method</p>
                            <p className="text-xs text-muted-foreground">
                              {authMethod === "metamask" ? "MetaMask Wallet" : "Email Account"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-600 font-medium">Connected</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 dark:bg-muted rounded-xl">
                          <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{stats.hoursLearned}</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Hours Learned</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 dark:bg-muted rounded-xl">
                          <Award className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-green-900 dark:text-green-300">{stats.certificatesEarned}</p>
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Certificates</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Social Links Tab */
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-4">Connect Your Social Accounts</h4>
                    
                    {isEditingSocial && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                            <ExternalLink className="w-5 h-5 text-muted-foreground" />
                            <span>GitHub Profile</span>
                          </label>
                          <input
                            type="text"
                            value={socialData.github}
                            onChange={(e) => setSocialData({...socialData, github: e.target.value})}
                            placeholder="username or profile URL"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-muted text-foreground placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                            <ExternalLink className="w-5 h-5 text-blue-500" />
                            <span>LinkedIn Profile</span>
                          </label>
                          <input
                            type="text"
                            value={socialData.linkedin}
                            onChange={(e) => setSocialData({...socialData, linkedin: e.target.value})}
                            placeholder="username or profile URL"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-muted text-foreground placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                            <Link2 className="w-5 h-5 text-sky-400" />
                            <span>X / Twitter Profile</span>
                          </label>
                          <input
                            type="text"
                            value={socialData.twitter}
                            onChange={(e) => setSocialData({...socialData, twitter: e.target.value})}
                            placeholder="@username or profile URL"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-muted text-foreground placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          />
                        </div>

                        <button
                          onClick={() => {
                            handleSocialUpdate()
                            setIsEditingSocial(false)
                          }}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 text-white rounded-lg transition-colors mt-6"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save Links</span>
                        </button>
                      </div>
                    )}

                    {!isEditingSocial ? (
                      <>
                        <div className="space-y-3">
                          {socialData.github && (
                            <a
                              href={socialData.github.startsWith('http') ? socialData.github : `https://github.com/${socialData.github}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-muted/60 transition-all"
                            >
                              <ExternalLink className="w-5 h-5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground flex-1 truncate">{socialData.github}</span>
                              <Link2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            </a>
                          )}
                          {socialData.linkedin && (
                            <a
                              href={socialData.linkedin.startsWith('http') ? socialData.linkedin : `https://linkedin.com/in/${socialData.linkedin}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-muted/60 transition-all"
                            >
                              <ExternalLink className="w-5 h-5 text-blue-500" />
                              <span className="text-sm text-muted-foreground flex-1 truncate">{socialData.linkedin}</span>
                              <Link2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            </a>
                          )}
                          {socialData.twitter && (
                            <a
                              href={socialData.twitter.startsWith('http') ? socialData.twitter : `https://twitter.com/${socialData.twitter}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-muted/60 transition-all"
                            >
                              <Link2 className="w-5 h-5 text-sky-400" />
                              <span className="text-sm text-muted-foreground flex-1 truncate">{socialData.twitter}</span>
                              <Link2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            </a>
                          )}
                        </div>
                        {!socialData.github && !socialData.linkedin && !socialData.twitter && (
                          <div className="text-center py-8 px-4 bg-gray-50 dark:bg-muted rounded-xl border border-border">
                            <p className="text-sm text-gray-600 dark:text-gray-300">No social links added yet</p>
                            <button
                              onClick={() => setIsEditingSocial(true)}
                              className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold"
                            >
                              Add your first link
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => setIsEditingSocial(true)}
                          className="w-full mt-4 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-muted text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Edit Links</span>
                        </button>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Streak Calendar */}
            <div className="mt-6 bg-card rounded-2xl shadow-sm border border-border p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Learning Streak</h3>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.currentStreak}</p>
                  <p className="text-sm text-muted-foreground">days in a row</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Best streak</p>
                  <p className="text-2xl font-bold text-foreground">{stats.bestStreak} days</p>
                </div>
              </div>
              
              {/* GitHub-style contribution graph */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-3">Last 12 weeks</p>
                <div className="grid grid-cols-12 gap-1">
                  {[...Array(84)].map((_, i) => {
                    // Calculate activity based on current streak
                    let activity = 0
                    if (stats.currentStreak > 0) {
                      // Days in current streak show full activity
                      if (i >= 84 - stats.currentStreak) {
                        activity = 0.85 + Math.random() * 0.15
                      } else {
                        // Past days show decreasing activity
                        activity = Math.random() * 0.4
                      }
                    } else {
                      // No streak - show light activity
                      activity = Math.random() * 0.3
                    }
                    
                    let bgColor = 'bg-gray-100 dark:bg-muted'
                    if (activity > 0.75) bgColor = 'bg-green-600'
                    else if (activity > 0.5) bgColor = 'bg-green-400'
                    else if (activity > 0.25) bgColor = 'bg-green-200'
                    else if (activity > 0) bgColor = 'bg-green-100'
                    
                    return (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-sm ${bgColor} cursor-pointer hover:ring-2 hover:ring-offset-1 dark:hover:ring-offset-gray-800 hover:ring-green-600 transition-all`}
                        title={`Week ${Math.floor(i / 7) + 1}`}
                      />
                    )
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-gray-100 dark:bg-muted rounded-sm"></div>
                    <div className="w-3 h-3 bg-green-100 dark:bg-green-900 rounded-sm"></div>
                    <div className="w-3 h-3 bg-green-400 dark:bg-green-600 rounded-sm"></div>
                    <div className="w-3 h-3 bg-green-600 dark:bg-green-500 rounded-sm"></div>
                  </div>
                  <span>More</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-foreground">Recent Activity</h3>
                <button
                  onClick={() => setShowAllActivities((prev) => !prev)}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold hover:bg-indigo-50 dark:hover:bg-gray-700 px-3 py-1 rounded-lg transition-all duration-200"
                >
                  {showAllActivities ? "Show less" : "View all →"}
                </button>
              </div>

              <div className="space-y-4">
                {visibleActivities.map((activity) => {
                  const iconConfig = activityIconConfig(activity.type)
                  const Icon = iconConfig.icon
                  return (
                  <div key={activity.id} className="flex items-center space-x-4 p-4 hover:bg-muted/60 rounded-xl transition-all duration-200 border border-gray-100 dark:border-border hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-md">
                    <div className={`p-3 rounded-xl ${iconConfig.bgColor} shadow-sm`}>
                      <Icon className={`w-5 h-5 ${iconConfig.textColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{activity.title}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{activity.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.timestamp_utc || activity.completed_at}</p>
                    </div>
                    <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  </div>
                )})}
                {realActivities.length === 0 && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">No recent activity yet.</div>
                )}
              </div>
            </div>
          </div>

          {/* Certificates */}
          <div className="lg:col-span-3">
            <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-foreground">Your Certificates</h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {certificates.length} total
                </span>
              </div>

              {certificates.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No certificates yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {certificates.map((cert) => (
                    <a
                      key={cert.certificate_id}
                      href={cert.public_url || cert.unique_url || `/certificate/${cert.certificate_id}`}
                      className="group rounded-xl border border-gray-200 dark:border-border p-4 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground group-hover:text-indigo-600">
                            {cert.course_title || "Course Certificate"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Instructor: {cert.instructor_name || cert.mentor_name || "OpenLearnX"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Completed: {new Date(cert.completion_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-xs font-mono text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
                          {cert.certificate_id}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
