"use client"

import { useAuth } from "@/context/auth-context"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { 
  User, 
  LogOut, 
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
  X
} from "lucide-react"

export default function DashboardPage() {
  const { user, firebaseUser, walletConnected, logout, authMethod } = useAuth()
  const router = useRouter()
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    avatar: user?.avatar || ''
  })
  
  const [stats, setStats] = useState({
    coursesCompleted: 12,
    totalXP: 2450,
    currentStreak: 7,
    rank: 156,
    certificatesEarned: 3,
    hoursLearned: 45
  })

  useEffect(() => {
    if (!user && !firebaseUser) {
      router.replace("/auth/login")
    }
  }, [user, firebaseUser, router])

  const handleProfileUpdate = async () => {
    try {
      // Here you would call your API to update profile
      // await updateProfile(profileData)
      setIsEditingProfile(false)
      console.log("Profile updated:", profileData)
    } catch (error) {
      console.error("Failed to update profile:", error)
    }
  }

  if (!user && !firebaseUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Professional Header */}
      <header className="bg-white shadow-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    OpenLearnX
                  </h1>
                  <p className="text-xs text-gray-500">Learn • Earn • Grow</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200">
                <Settings className="w-5 h-5" />
              </button>
              <button 
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:text-white hover:bg-red-600 rounded-xl transition-all duration-200 border border-red-200 hover:border-red-600"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  Welcome back! 👋
                </h2>
                <p className="text-indigo-100 text-lg">
                  Ready to continue your learning journey?
                </p>
                {authMethod === "metamask" && user ? (
                  <div className="mt-3 flex items-center space-x-2">
                    <Wallet className="w-4 h-4 text-orange-300" />
                    <span className="text-sm text-indigo-100">
                      Connected: {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                    </span>
                  </div>
                ) : firebaseUser && (
                  <div className="mt-3 flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-blue-300" />
                    <span className="text-sm text-indigo-100">
                      {firebaseUser.email}
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
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total XP</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalXP.toLocaleString()}</p>
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

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Courses</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.coursesCompleted}</p>
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

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Streak</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.currentStreak} days</p>
              </div>
              <div className="p-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg">
                <Target className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-sm text-orange-600 font-medium">🔥 Keep it up!</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Global Rank</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">#{stats.rank}</p>
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
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card with Edit Functionality */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Profile</h3>
                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                >
                  {isEditingProfile ? <X className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                </button>
              </div>

              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <User className="w-10 h-10 text-white" />
                </div>
                {isEditingProfile ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      placeholder="Your name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                    />
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                      placeholder="Your bio"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center h-20 resize-none"
                    />
                    <button
                      onClick={handleProfileUpdate}
                      className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors mx-auto"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {profileData.name || "Your Name"}
                    </h4>
                    <p className="text-gray-600 text-sm mt-1">
                      {profileData.bio || "Add a bio to tell others about yourself"}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                  <div className="flex items-center space-x-3">
                    {authMethod === "metamask" ? (
                      <Wallet className="w-6 h-6 text-orange-600" />
                    ) : (
                      <Mail className="w-6 h-6 text-blue-600" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Auth Method</p>
                      <p className="text-xs text-gray-600">
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
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-900">{stats.hoursLearned}</p>
                    <p className="text-xs text-blue-600 font-medium">Hours Learned</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <Award className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-900">{stats.certificatesEarned}</p>
                    <p className="text-xs text-green-600 font-medium">Certificates</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
                <button className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold hover:bg-indigo-50 px-3 py-1 rounded-lg transition-all duration-200">
                  View all →
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { 
                    type: "course", 
                    title: "Completed React Fundamentals", 
                    time: "2 hours ago", 
                    icon: BookOpen, 
                    color: "green",
                    bgColor: "bg-green-100",
                    textColor: "text-green-600"
                  },
                  { 
                    type: "quiz", 
                    title: "Scored 95% on JavaScript Quiz", 
                    time: "1 day ago", 
                    icon: Award, 
                    color: "blue",
                    bgColor: "bg-blue-100",
                    textColor: "text-blue-600"
                  },
                  { 
                    type: "streak", 
                    title: "7-day learning streak!", 
                    time: "Today", 
                    icon: Target, 
                    color: "orange",
                    bgColor: "bg-orange-100",
                    textColor: "text-orange-600"
                  },
                  { 
                    type: "rank", 
                    title: "Moved up 5 positions in leaderboard", 
                    time: "2 days ago", 
                    icon: TrendingUp, 
                    color: "purple",
                    bgColor: "bg-purple-100",
                    textColor: "text-purple-600"
                  },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-xl transition-all duration-200 border border-gray-100 hover:border-gray-200 hover:shadow-md">
                    <div className={`p-3 rounded-xl ${activity.bgColor} shadow-sm`}>
                      <activity.icon className={`w-5 h-5 ${activity.textColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                <h4 className="text-sm font-semibold text-indigo-900 mb-2">🚀 Keep Learning!</h4>
                <p className="text-xs text-indigo-700">
                  You're doing great! Complete 2 more courses this week to maintain your streak.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
