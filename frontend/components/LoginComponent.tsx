"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wallet, Mail, Lock, Loader2, Shield, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "react-hot-toast"

export function LoginComponent() {
  const { 
    connectWallet, 
    loginWithEmail, 
    isLoadingAuth, 
    walletConnected, 
    walletAddress,
    user,
    authMethod 
  } = useAuth()
  
  const router = useRouter()
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isEmailLogin, setIsEmailLogin] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  const [username, setUsername] = useState("")
  const [isConnectingWallet, setIsConnectingWallet] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')

  // ✅ Check if user is already authenticated
  useEffect(() => {
    if (!isLoadingAuth) {
      if (user && authMethod) {
        console.log('✅ User already authenticated:', authMethod)
        setConnectionStatus('connected')
        router.push("/dashboard")
      }
    }
  }, [isLoadingAuth, user, authMethod, router])

  const handleWalletConnect = async () => {
    setIsConnectingWallet(true)
    setConnectionStatus('connecting')
    
    try {
      console.log('🦊 Starting MetaMask connection...')
      
      // Check if MetaMask is installed
      if (typeof window !== 'undefined' && !window.ethereum) {
        toast.error("MetaMask not detected. Please install MetaMask extension.")
        setConnectionStatus('error')
        return
      }

      const success = await connectWallet()
      
      if (success) {
        setConnectionStatus('connected')
        console.log('✅ MetaMask connection successful')
        
        // Small delay to ensure state is updated
        setTimeout(() => {
          router.push("/dashboard")
        }, 1000)
      } else {
        setConnectionStatus('error')
      }
    } catch (error: any) {
      console.error('❌ Wallet connection error:', error)
      setConnectionStatus('error')
    } finally {
      setIsConnectingWallet(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password")
      return
    }

    if (!email.includes('@')) {
      toast.error("Please enter a valid email address")
      return
    }

    try {
      console.log('📧 Attempting email login for:', email)
      const success = await loginWithEmail(email, password)
      if (success) {
        setTimeout(() => router.push("/dashboard"), 500)
      }
    } catch (error: any) {
      console.error('❌ Email login failed:', error)
    }
  }

  const { signupWithEmail } = useAuth()

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim() || !username.trim()) {
      toast.error("Please fill in all fields")
      return
    }

    if (!email.includes('@')) {
      toast.error("Please enter a valid email address")
      return
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    try {
      console.log('📧 Attempting email signup for:', email)
      const success = await signupWithEmail(email, password, username)
      if (success) {
        setTimeout(() => router.push("/dashboard"), 500)
      }
    } catch (error: any) {
      console.error('❌ Email signup failed:', error)
    }
  }

  // ✅ Show connected state if already authenticated
  if (user && authMethod) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-xl font-bold text-green-600">
              {authMethod === 'metamask' ? 'MetaMask Connected' : 'Logged In'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <Wallet className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                {authMethod === 'metamask' && walletAddress ? (
                  <>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</>
                ) : (
                  <>{user.email}</>
                )}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Button onClick={() => router.push("/dashboard")} className="w-full">
                Go to Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Welcome to OpenLearnX
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-300">
              Connect your MetaMask wallet or login with email
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* MetaMask Login - Primary Option */}
          <div className="space-y-4">
            <Button
              onClick={handleWalletConnect}
              disabled={isConnectingWallet || isLoadingAuth || connectionStatus === 'connecting'}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 transition-all duration-200"
            >
              {isConnectingWallet || connectionStatus === 'connecting' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting MetaMask...
                </>
              ) : connectionStatus === 'error' ? (
                <>
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Retry MetaMask Connection
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5 mr-2" />
                  Connect MetaMask Wallet
                </>
              )}
            </Button>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <p className="text-xs text-purple-700 dark:text-purple-300 text-center">
                Recommended: Get Web3 features, blockchain verification, and token rewards.
              </p>
            </div>
          </div>

          <div className="relative">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-white dark:bg-gray-800 px-3 text-sm text-gray-500">
                or
              </span>
            </div>
          </div>

          {/* Email Login - Alternative Option */}
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={() => setIsEmailLogin(!isEmailLogin)}
              className="w-full"
            >
              <Mail className="w-4 h-4 mr-2" />
              {isEmailLogin ? 'Hide Email Options' : 'Login with Email'}
            </Button>

            {isEmailLogin && (
              <div className="space-y-4 mt-4">
                {/* Toggle between Login and Signup */}
                <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                  <Button
                    variant={!isSignup ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setIsSignup(false)}
                    className="flex-1"
                  >
                    Login
                  </Button>
                  <Button
                    variant={isSignup ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setIsSignup(true)}
                    className="flex-1"
                  >
                    Sign Up
                  </Button>
                </div>

                <form onSubmit={isSignup ? handleEmailSignup : handleEmailLogin} className="space-y-4">
                  {isSignup && (
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose a username"
                        disabled={isLoadingAuth}
                        required={isSignup}
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      disabled={isLoadingAuth}
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
                      placeholder={isSignup ? "Create a password (min 6 characters)" : "Enter your password"}
                      disabled={isLoadingAuth}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoadingAuth || !email.trim() || !password.trim() || (isSignup && !username.trim())}
                    className="w-full"
                  >
                    {isLoadingAuth ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isSignup ? 'Creating Account...' : 'Logging in...'}
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        {isSignup ? 'Create Account' : 'Login'}
                      </>
                    )}
                  </Button>
                </form>
              </div>
            )}
          </div>

          {/* MetaMask Installation Help */}
          {typeof window !== 'undefined' && !window.ethereum && (
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-orange-700 dark:text-orange-300">
                MetaMask not detected. 
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-semibold text-orange-600 ml-1"
                  onClick={() => window.open('https://metamask.io/download/', '_blank')}
                >
                  Install MetaMask →
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Connection Status */}
          {connectionStatus === 'error' && (
            <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-700 dark:text-red-300">
                Connection failed. Please make sure MetaMask is unlocked and try again.
              </AlertDescription>
            </Alert>
          )}

          <div className="text-center">
            <p className="text-xs text-gray-500">
              New to OpenLearnX? Your account will be created automatically upon first login.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
