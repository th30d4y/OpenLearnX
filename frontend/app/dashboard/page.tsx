"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { DashboardStatsOverview } from "@/components/dashboard-stats"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  const { isLoadingAuth, walletConnected, walletAddress, firebaseUser, authMethod } = useAuth()
  const router = useRouter()
  const [showDashboard, setShowDashboard] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  
  useEffect(() => {
    // Debug authentication state
    const authState = {
      isLoadingAuth,
      walletConnected,
      walletAddress: !!walletAddress,
      firebaseUser: !!firebaseUser,
      authMethod,
      localStorage: {
        token: !!localStorage.getItem('openlearnx_jwt_token'),
        wallet: !!localStorage.getItem('openlearnx_wallet'),
        user: !!localStorage.getItem('openlearnx_user')
      }
    }
    
    setDebugInfo(authState)
    console.log('📊 Dashboard auth state:', authState)

    // Give auth some time to initialize
    const timer = setTimeout(() => {
      const isAuthenticated = (walletConnected && walletAddress) || firebaseUser
      
      if (isAuthenticated) {
        console.log('✅ User authenticated, showing dashboard')
        setShowDashboard(true)
      } else if (!isLoadingAuth) {
        console.log('❌ User not authenticated, redirecting to login')
        router.replace("/auth/login")
      }
    }, 2000) // Wait 2 seconds for auth to stabilize

    return () => clearTimeout(timer)
  }, [isLoadingAuth, walletConnected, walletAddress, firebaseUser, authMethod, router])

  // Show loading state
  if (isLoadingAuth || !showDashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-purple-600" />
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Loading Dashboard...
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {walletConnected ? `Connected to ${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}` : 
               firebaseUser ? `Logged in as ${firebaseUser.email}` : 
               'Verifying authentication...'}
            </p>
          </div>
          
          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && debugInfo && (
            <details className="text-left text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 p-2 rounded mt-4">
              <summary>Debug Info</summary>
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </details>
          )}
        </div>
      </div>
    )
  }

  // Show error state if no auth after loading
  if (!walletConnected && !firebaseUser && !isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Authentication Required
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Please log in to access your dashboard.
          </p>
          <div className="space-y-2">
            <Button onClick={() => router.push("/auth/login")} className="w-full">
              Go to Login
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                localStorage.clear()
                window.location.href = "/auth/login"
              }} 
              className="w-full"
            >
              Clear Data & Login
            </Button>
          </div>
          
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <details className="text-left text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 p-2 rounded mt-4">
              <summary>Debug Info</summary>
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </details>
          )}
        </div>
      </div>
    )
  }

  // Show dashboard if authenticated
  return <DashboardStatsOverview />
}
