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
import Link from "next/link"
import { MetaMaskEmailModal } from "@/components/metamask-email-modal"

export default function SignupPage() {
  const { 
    user, 
    walletConnected, 
    walletAddress,
    isLoadingAuth, 
    authMethod,
    token,
    showMetaMaskEmailModal,
    setShowMetaMaskEmailModal,
    connectWallet,
    signupWithEmail
  } = useAuth()
  
  const router = useRouter()
  const hasRedirected = useRef(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [username, setUsername] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // If already authenticated, redirect to dashboard
    if ((walletConnected && walletAddress && user) || (user && authMethod === "email")) {
      if (!hasRedirected.current) {
        hasRedirected.current = true
        router.replace("/dashboard")
      }
    }
  }, [user, walletConnected, walletAddress, authMethod, router])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.error("Please fill in all fields")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setIsSubmitting(true)

    try {
      const success = await signupWithEmail(email, password, username || email.split("@")[0])
      
      if (success) {
        // Auth context handles everything including token storage
        // Redirect will be handled by the useEffect
        setTimeout(() => {
          router.replace("/dashboard")
        }, 500)
      }
    } catch (error: any) {
      console.error("Signup error:", error)
      toast.error(error.message || "Signup failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMetaMaskSignup = async () => {
    try {
      await connectWallet()
      toast.success("Connected with MetaMask!")
      setTimeout(() => {
        if (walletConnected && walletAddress && user) {
          router.replace("/dashboard")
        }
      }, 500)
    } catch (error: any) {
      console.error("MetaMask connection failed:", error)
      toast.error("MetaMask connection failed")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Join OpenLearnX
          </CardTitle>
          <p className="text-sm text-gray-600">Create your account to start learning</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* MetaMask Signup */}
          <div className="space-y-4">
            <Button
              onClick={handleMetaMaskSignup}
              disabled={isLoadingAuth || isSubmitting}
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
                  Sign Up with MetaMask
                </>
              )}
            </Button>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <p className="text-xs text-purple-700 dark:text-purple-300 text-center">
                Get blockchain features and Web3 verification
              </p>
            </div>
          </div>

          <Separator />

          {/* Email Signup Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Label htmlFor="username">Username (optional)</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                disabled={isSubmitting || isLoadingAuth}
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={isSubmitting || isLoadingAuth}
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
                placeholder="At least 6 characters"
                disabled={isSubmitting || isLoadingAuth}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                disabled={isSubmitting || isLoadingAuth}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || isLoadingAuth || !email.trim() || !password.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Sign Up with Email
                </>
              )}
            </Button>
          </form>

          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-purple-600 hover:text-purple-700 font-semibold">
                Sign In
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* MetaMask Email Modal */}
      {token && walletAddress && (
        <MetaMaskEmailModal
          isOpen={showMetaMaskEmailModal}
          walletAddress={walletAddress}
          token={token}
          onSuccess={(user) => {
            setShowMetaMaskEmailModal(false)
            toast.success("Profile setup complete!")
          }}
          onCancel={() => {
            setShowMetaMaskEmailModal(false)
            // User can always add email later from dashboard
          }}
        />
      )}
    </div>
  )
}
