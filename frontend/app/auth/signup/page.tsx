"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Wallet, Mail, Lock, Loader2, BookOpen, User } from "lucide-react"
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
    signupWithEmail,
  } = useAuth()

  const router = useRouter()
  const hasRedirected = useRef(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [username, setUsername] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
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
      if (success) setTimeout(() => router.replace("/dashboard"), 500)
    } catch (error: any) {
      toast.error(error.message || "Signup failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMetaMaskSignup = async () => {
    try {
      await connectWallet()
      setTimeout(() => {
        if (walletConnected && walletAddress && user) router.replace("/dashboard")
      }, 500)
    } catch {
      toast.error("MetaMask connection failed")
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-4">
            <BookOpen className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Create account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start your learning journey on OpenLearnX
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-5">
          {/* MetaMask */}
          <Button
            onClick={handleMetaMaskSignup}
            disabled={isLoadingAuth || isSubmitting}
            className="w-full gap-2"
            size="lg"
          >
            {isLoadingAuth ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            {isLoadingAuth ? "Connecting…" : "Sign up with MetaMask"}
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
              <span className="bg-card px-2 text-xs text-muted-foreground">or sign up with email</span>
            </span>
          </div>

          {/* Email form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="username"
                type="text"
                placeholder="coollearner"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full gap-2"
              size="lg"
              disabled={isSubmitting || isLoadingAuth || !email.trim() || !password.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      {token && walletAddress && (
        <MetaMaskEmailModal
          isOpen={showMetaMaskEmailModal}
          walletAddress={walletAddress}
          token={token}
          onSuccess={() => {
            setShowMetaMaskEmailModal(false)
            toast.success("Profile setup complete!")
          }}
          onCancel={() => setShowMetaMaskEmailModal(false)}
        />
      )}
    </div>
  )
}
