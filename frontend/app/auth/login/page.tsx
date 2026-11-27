"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Wallet, Mail, Lock, Loader2, CheckCircle2, BookOpen } from "lucide-react"
import { toast } from "react-hot-toast"
import Link from "next/link"
import { MetaMaskEmailModal } from "@/components/metamask-email-modal"

export default function LoginPage() {
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
    loginWithEmail,
  } = useAuth()

  const router = useRouter()
  const hasRedirected = useRef(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isLoadingAuth || hasRedirected.current) return
    const isMetaMaskAuth = walletConnected && walletAddress && user && authMethod === "metamask"
    const isEmailAuth = user && authMethod === "email"
    if (isMetaMaskAuth || isEmailAuth) {
      hasRedirected.current = true
      setTimeout(() => router.replace("/dashboard"), 100)
    }
  }, [user, walletConnected, walletAddress, authMethod, isLoadingAuth, router])

  const handleMetaMaskLogin = async () => {
    try {
      await connectWallet()
      setTimeout(() => {
        if (walletConnected && walletAddress && user && !hasRedirected.current) {
          hasRedirected.current = true
          router.replace("/dashboard")
        }
      }, 500)
    } catch {}
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password")
      return
    }
    setIsSubmitting(true)
    try {
      await loginWithEmail(email, password)
    } catch (error: any) {
      toast.error(error.message || "Login failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isAuthenticated =
    (walletConnected && walletAddress && user) || (user && authMethod === "email")

  if (isAuthenticated && !hasRedirected.current) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
          <p className="font-semibold text-foreground">Authenticated — redirecting…</p>
          <Button onClick={() => { hasRedirected.current = true; router.replace("/dashboard") }} className="w-full">
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-4">
            <BookOpen className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back to OpenLearnX
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-5">
          {/* MetaMask */}
          <Button
            onClick={handleMetaMaskLogin}
            disabled={isLoadingAuth || isSubmitting}
            className="w-full gap-2"
            size="lg"
          >
            {isLoadingAuth ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            {isLoadingAuth ? "Connecting…" : "Connect MetaMask Wallet"}
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
              <span className="bg-card px-2 text-xs text-muted-foreground">or</span>
            </span>
          </div>

          {/* Email toggle */}
          {!showEmailForm ? (
            <Button
              variant="outline"
              className="w-full gap-2"
              size="lg"
              onClick={() => setShowEmailForm(true)}
            >
              <Mail className="h-4 w-4" />
              Sign in with Email
            </Button>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-4">
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full gap-2"
                size="lg"
                disabled={isSubmitting || !email.trim() || !password.trim()}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setShowEmailForm(false)}
              >
                Back
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/auth/signup" className="font-medium text-primary hover:underline">
            Sign up free
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
