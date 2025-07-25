"use client"

import { useState } from "react"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AuthButtons() {
  const { user, firebaseUser, isLoadingAuth, authMethod, connectWallet, loginWithEmail, signupWithEmail, logout } =
    useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const handleEmailLogin = async () => {
    await loginWithEmail(email, password)
    setIsAuthModalOpen(false)
  }

  const handleEmailSignup = async () => {
    await signupWithEmail(email, password)
    setIsAuthModalOpen(false)
  }

  const displayAddress = user?.wallet_address || firebaseUser?.email || "Guest"

  return (
    <div className="flex items-center gap-4">
      {authMethod ? (
        <>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Connected:{" "}
            {authMethod === "metamask" && user?.wallet_address
              ? `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`
              : authMethod === "firebase" && firebaseUser?.email
                ? firebaseUser.email
                : displayAddress}
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
                  Use email for a quick testing process (quizzes only).
                </p>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleEmailLogin}
                    disabled={isLoadingAuth}
                    className="flex-1 bg-primary-purple hover:bg-primary-purple/90 text-white"
                  >
                    {isLoadingAuth && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Login
                  </Button>
                  <Button
                    onClick={handleEmailSignup}
                    disabled={isLoadingAuth}
                    variant="outline"
                    className="flex-1 dark:text-gray-100 dark:border-gray-600 bg-transparent"
                  >
                    {isLoadingAuth && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign Up
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
