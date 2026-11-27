"use client"

import { useState } from "react"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Loader2, Wallet, Mail, User } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { toast } from "react-hot-toast"

export function AuthButtons() {
  const { user, isLoadingAuth, authMethod, connectWallet, loginWithEmail, signupWithEmail, logout } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter email and password")
      return
    }
    const success = await loginWithEmail(email, password)
    if (success) {
      setIsAuthModalOpen(false)
      setEmail("")
      setPassword("")
    }
  }

  const handleEmailSignup = async () => {
    if (!email.trim() || !password.trim() || !username.trim()) {
      toast.error("Please fill in all fields")
      return
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    const success = await signupWithEmail(email, password, username)
    if (success) {
      setIsAuthModalOpen(false)
      setEmail("")
      setPassword("")
      setUsername("")
    }
  }

  if (authMethod && user) {
    const displayName =
      authMethod === "metamask" && user.wallet_address
        ? `${user.wallet_address.slice(0, 6)}…${user.wallet_address.slice(-4)}`
        : user.email || user.id || "User"

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground max-w-[140px] truncate">
          {authMethod === "metamask" ? (
            <Wallet className="h-3 w-3 shrink-0" />
          ) : (
            <Mail className="h-3 w-3 shrink-0" />
          )}
          <span className="truncate">{displayName}</span>
        </div>
        <Button onClick={logout} variant="outline" size="sm" disabled={isLoadingAuth} className="h-8 text-xs">
          Logout
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
      <DialogTrigger asChild>
        <Button disabled={isLoadingAuth} size="sm">
          {isLoadingAuth && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Login / Sign Up
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in to OpenLearnX</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="metamask" className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="metamask">MetaMask</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>

          <TabsContent value="metamask" className="pt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your MetaMask wallet for full access including blockchain certificates.
            </p>
            <Button onClick={connectWallet} disabled={isLoadingAuth} className="w-full gap-2">
              {isLoadingAuth ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              Connect MetaMask
            </Button>
          </TabsContent>

          <TabsContent value="email" className="pt-2">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="pt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button onClick={handleEmailLogin} disabled={isLoadingAuth} className="w-full">
                  {isLoadingAuth && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign in
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="pt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input id="signup-username" type="text" placeholder="coollearner" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button onClick={handleEmailSignup} disabled={isLoadingAuth} className="w-full">
                  {isLoadingAuth && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create account
                </Button>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
