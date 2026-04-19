"use client"

import { useState } from "react"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

  const displayAddress = user?.wallet_address || user?.email || "Guest"

  return (
    <div className="flex items-center gap-4">
      {authMethod && user ? (
        <>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {authMethod === "metamask" && user.wallet_address
              ? `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`
              : user.email || displayAddress}
          </span>
          <Button onClick={logout} variant="outline" disabled={isLoadingAuth}>
            Logout
          </Button>
        </>
      ) : (
        <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
          <DialogTrigger asChild>
            <Button disabled={isLoadingAuth}>
              {isLoadingAuth && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login / Sign Up
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] dark:bg-gray-900 dark:text-gray-100">
            <DialogHeader>
              <DialogTitle>Choose your authentication method</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="metamask" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="metamask">MetaMask</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>
              <TabsContent value="metamask" className="space-y-4 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Connect your MetaMask wallet for full access to courses, coding, and blockchain features.
                </p>
                <Button
                  onClick={connectWallet}
                  disabled={isLoadingAuth}
                  className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white"
                >
                  {isLoadingAuth && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Connect MetaMask
                </Button>
              </TabsContent>
              <TabsContent value="email" className="space-y-4 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Use email to access courses and quizzes.
                </p>
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>
                  <TabsContent value="login" className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <Button
                      onClick={handleEmailLogin}
                      disabled={isLoadingAuth}
                      className="w-full bg-primary-purple hover:bg-primary-purple/90 text-white"
                    >
                      {isLoadingAuth && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Login
                    </Button>
                  </TabsContent>
                  <TabsContent value="signup" className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-username">Username</Label>
                      <Input
                        id="signup-username"
                        type="text"
                        placeholder="Choose a username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Min 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <Button
                      onClick={handleEmailSignup}
                      disabled={isLoadingAuth}
                      className="w-full bg-primary-purple hover:bg-primary-purple/90 text-white"
                    >
                      {isLoadingAuth && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Account
                    </Button>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
