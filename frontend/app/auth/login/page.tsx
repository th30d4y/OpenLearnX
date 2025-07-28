"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Wallet, Mail, Lock, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "react-hot-toast"

export default function LoginPage() {
  const { 
    user, 
    firebaseUser, 
    walletConnected, 
    walletAddress,
    isLoadingAuth, 
    authMethod,
    connectWallet, 
    loginWithEmail 
  } = useAuth()
  
  const router = useRouter()
  const hasRedirected = useRef(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isEmailLogin, setIsEmailLogin] = useState(false)
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false)

  // ✅ FIXED: More comprehensive redirect logic with debug logging
  useEffect(() => {
    console.log("🔍 Login page - checking auth state:", {
      isLoadingAuth,
      hasRedirected: hasRedirected.current,
      user: !!user,
      firebaseUser: !!firebaseUser,
      walletConnected,
      walletAddress,
      authMethod
    })

    // Don't redirect if still loading or already redirected
    if (isLoadingAuth || hasRedirected.current) {
      console.log("⏳ Skipping redirect - loading or already redirected")
      return
    }

    // Check for successful authentication
    const isMetaMaskAuth = walletConnected && walletAddress && user && authMethod === "metamask"
    const isFirebaseAuth = firebaseUser && authMethod === "firebase"
    const isAuthenticated = isMetaMaskAuth || isFirebaseAuth

    console.log("🔍 Authentication check:", {
      isMetaMaskAuth,
      isFirebaseAuth,
      isAuthenticated
    })

    if (isAuthenticated && !hasRedirected.current) {
      console.log("✅ User authenticated - redirecting to dashboard...")
      hasRedirected.current = true
      
      // Add a small delay to ensure state is fully updated
      setTimeout(() => {
        router.replace("/dashboard")
      }, 100)
    }
  }, [
    user, 
    firebaseUser, 
    walletConnected, 
    walletAddress, 
    authMethod,
    isLoadingAuth, 
    router
  ]) // ✅ FIXED: Include all necessary dependencies

  // ✅ Handle MetaMask connection with immediate redirect check
  const handleMetaMaskLogin = async () => {
    try {
      console.log("🦊 Starting MetaMask login...")
      await connectWallet()
      console.log("🦊 MetaMask login completed, checking for redirect...")
      
      // Force a redirect check after a short delay
      setTimeout(() => {
        const isAuth = walletConnected && walletAddress && user && authMethod === "metamask"
        if (isAuth && !hasRedirected.current) {
          console.log("🔄 Force redirecting after MetaMask success...")
          hasRedirected.current = true
          router.replace("/dashboard")
        }
      }, 500)
    } catch (error) {
      console.error("❌ MetaMask login failed:", error)
    }
  }

  // ✅ Handle email login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password")
      return
    }

    setIsSubmittingEmail(true)

    try {
      await loginWithEmail(email, password)
      // Redirect will be handled by useEffect
    } catch (error: any) {
      console.error("❌ Email login failed:", error)
      toast.error(error.message || "Login failed")
    } finally {
      setIsSubmittingEmail(false)
    }
  }

  // ✅ Show success state when authenticated but not yet redirected
  const isAuthenticated = (walletConnected && walletAddress && user) || firebaseUser
  
  if (isAuthenticated && !hasRedirected.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-xl font-bold text-green-600">
              Login Successful! ✅
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-700">
              {authMethod === "metamask" 
                ? `🦊 MetaMask connected: ${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}`
                : `📧 Email: ${firebaseUser?.email}`
              }
            </p>
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Redirecting to dashboard...</span>
            </div>
            
            {/* Manual redirect button as backup */}
            <Button 
              onClick={() => {
                if (!hasRedirected.current) {
                  hasRedirected.current = true
                  router.replace("/dashboard")
                }
              }} 
              className="w-full mt-4"
            >
              Go to Dashboard Manually
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ✅ Show login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Welcome to OpenLearnX! 🎓
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* MetaMask Login */}
          <div className="space-y-4">
            <Button
              onClick={handleMetaMaskLogin}
              disabled={isLoadingAuth || isSubmittingEmail}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3"
            >
              {isLoadingAuth ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting MetaMask...
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5 mr-2" />
                  Connect MetaMask Wallet 🦊
                </>
              )}
            </Button>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <p className="text-xs text-purple-700 dark:text-purple-300 text-center">
                ✨ Recommended: Get Web3 features and blockchain verification!
              </p>
            </div>
          </div>

          <Separator />

          {/* Email Login */}
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={() => setIsEmailLogin(!isEmailLogin)}
              disabled={isLoadingAuth || isSubmittingEmail}
              className="w-full"
            >
              <Mail className="w-4 h-4 mr-2" />
              {isEmailLogin ? 'Hide Email Login' : 'Login with Email'}
            </Button>

            {isEmailLogin && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    disabled={isSubmittingEmail || isLoadingAuth}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={isSubmittingEmail || isLoadingAuth}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingEmail || isLoadingAuth || !email.trim() || !password.trim()}
                  className="w-full"
                >
                  {isSubmittingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Login with Email
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
