"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wallet, Mail, Lock, Loader2, Shield, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "react-hot-toast"

export default function LoginPage() {
  const { 
    connectWallet, 
    loginWithEmail, 
    isLoadingAuth, 
    walletConnected, 
    walletAddress,
    firebaseUser,
    authMethod
  } = useAuth()
  
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isEmailLogin, setIsEmailLogin] = useState(false)
  const [isConnectingWallet, setIsConnectingWallet] = useState(false)
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false)
  const hasRedirected = useRef(false)

  // ✅ Check for existing authentication
  useEffect(() => {
    if (hasRedirected.current || isLoadingAuth) return

    const checkAuth = setTimeout(() => {
      if (isLoadingAuth) return

      const isAuthenticated = (walletConnected && walletAddress) || firebaseUser

      if (isAuthenticated && !hasRedirected.current) {
        console.log('✅ User already authenticated, redirecting to dashboard...')
        hasRedirected.current = true
        router.replace("/dashboard")
      }
    }, 500)

    return () => clearTimeout(checkAuth)
  }, [isLoadingAuth, walletConnected, walletAddress, firebaseUser, router])

  // ✅ Handle MetaMask connection
  const handleWalletConnect = async () => {
    if (isConnectingWallet || isLoadingAuth) return

    setIsConnectingWallet(true)
    
    try {
      console.log('🦊 Starting MetaMask connection...')
      
      // Check if MetaMask is installed
      if (typeof window !== 'undefined' && !window.ethereum) {
        toast.error("MetaMask not detected. Please install MetaMask extension.")
        window.open('https://metamask.io/download/', '_blank')
        return
      }

      const success = await connectWallet()
      
      if (success) {
        console.log('✅ MetaMask connection successful')
        // Redirect will be handled by useEffect
      }
    } catch (error: any) {
      console.error('❌ Wallet connection error:', error)
    } finally {
      setIsConnectingWallet(false)
    }
  }

  // ✅ Handle email login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSubmittingEmail || isLoadingAuth) return
    
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password")
      return
    }

    setIsSubmittingEmail(true)

    try {
      await loginWithEmail(email, password)
      // Redirect will be handled by useEffect
    } catch (error: any) {
      console.error('❌ Email login failed:', error)
      toast.error(error.message || "Login failed. Please check your credentials.")
    } finally {
      setIsSubmittingEmail(false)
    }
  }

  // Show connected state
  if ((walletConnected && walletAddress) || firebaseUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-xl font-bold text-green-600">
              {walletConnected ? "MetaMask Connected! 🦊" : "Email Login Successful! 📧"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-700">
                {walletConnected 
                  ? `🦊 ${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}`
                  : `📧 ${firebaseUser?.email}`
                }
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={() => {
                if (!hasRedirected.current) {
                  hasRedirected.current = true
                  router.replace("/dashboard")
                }
              }} 
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading while initializing
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Initializing...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Welcome to OpenLearnX! 🎓
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* MetaMask Login */}
          <div className="space-y-4">
            <Button
              onClick={handleWalletConnect}
              disabled={isConnectingWallet || isLoadingAuth || isSubmittingEmail}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3"
            >
              {isConnectingWallet ? (
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
              disabled={isConnectingWallet || isSubmittingEmail}
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
                    disabled={isSubmittingEmail || isConnectingWallet}
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
                    disabled={isSubmittingEmail || isConnectingWallet}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingEmail || isConnectingWallet || !email.trim() || !password.trim()}
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

          {/* MetaMask Installation Help */}
          {typeof window !== 'undefined' && !window.ethereum && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-orange-700">
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
        </CardContent>
      </Card>
    </div>
  )
}
