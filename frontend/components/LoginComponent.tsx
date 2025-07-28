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
    firebaseUser,
    authMethod 
  } = useAuth()
  
  const router = useRouter()
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isEmailLogin, setIsEmailLogin] = useState(false)
  const [isConnectingWallet, setIsConnectingWallet] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')

  // ✅ Check if user is already authenticated
  useEffect(() => {
    if (!isLoadingAuth) {
      if (walletConnected && walletAddress) {
        console.log('✅ MetaMask already connected:', walletAddress)
        setConnectionStatus('connected')
        toast.success("Already connected to MetaMask!")
        router.push("/dashboard")
      } else if (firebaseUser) {
        console.log('✅ Firebase user already logged in:', firebaseUser.email)
        router.push("/dashboard")
      }
    }
  }, [isLoadingAuth, walletConnected, walletAddress, firebaseUser, router])

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
        toast.success("MetaMask connected successfully! 🦊")
        
        // Small delay to ensure state is updated
        setTimeout(() => {
          router.push("/dashboard")
        }, 1000)
      } else {
        setConnectionStatus('error')
        toast.error("Failed to connect MetaMask. Please try again.")
      }
    } catch (error: any) {
      console.error('❌ Wallet connection error:', error)
      setConnectionStatus('error')
      
      if (error.message?.includes('User rejected')) {
        toast.error("Connection cancelled by user.")
      } else if (error.message?.includes('MetaMask not detected')) {
        toast.error("Please install MetaMask extension.")
      } else {
        toast.error("MetaMask connection failed. Please try again.")
      }
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
      await loginWithEmail(email, password)
      toast.success("Logged in successfully!")
      router.push("/dashboard")
    } catch (error: any) {
      console.error('❌ Email login failed:', error)
      toast.error(error.message || "Login failed. Please check your credentials.")
    }
  }

  // ✅ Show connected state if already authenticated
  if (connectionStatus === 'connected' || (walletConnected && walletAddress)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-xl font-bold text-green-600">
              MetaMask Connected! 🦊
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <Wallet className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                🦊 {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
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
                Connect Different Wallet
              </Button>
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
              Welcome to OpenLearnX! 🎓
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
                  Connect MetaMask Wallet 🦊
                </>
              )}
            </Button>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <p className="text-xs text-purple-700 dark:text-purple-300 text-center">
                ✨ Recommended: Get Web3 features, blockchain verification, and token rewards!
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
              {isEmailLogin ? 'Hide Email Login' : 'Login with Email'}
            </Button>

            {isEmailLogin && (
              <form onSubmit={handleEmailLogin} className="space-y-4 mt-4">
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
                    placeholder="Enter your password"
                    disabled={isLoadingAuth}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoadingAuth || !email.trim() || !password.trim()}
                  className="w-full"
                >
                  {isLoadingAuth ? (
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
