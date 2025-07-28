"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  User, Wallet, CheckCircle2, AlertCircle, 
  Loader2, Sparkles, Shield 
} from "lucide-react"
import { toast } from "react-hot-toast"
import api from "@/lib/api"

interface UsernameSetupProps {
  userProfile: {
    user_id: string
    wallet_address?: string
    display_name?: string
    username_set?: boolean
    avatar_url?: string
  }
  onUsernameSet: (profile: any) => void
}

export function UsernameSetup({ userProfile, onUsernameSet }: UsernameSetupProps) {
  const [username, setUsername] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitUsername = async () => {
    if (!username.trim()) {
      toast.error("Please enter a username")
      return
    }

    if (username.length < 3) {
      toast.error("Username must be at least 3 characters long")
      return
    }

    setIsSubmitting(true)
    
    try {
      let response
      try {
        response = await api.post("/api/dashboard/set-username", {
          username: username.trim()
        })
      } catch (error) {
        // Fallback to update-profile
        response = await api.post("/api/dashboard/update-profile", {
          display_name: username.trim()
        })
      }

      if (response.success) {
        toast.success(`Username "${username}" set successfully! 🎉`)
        onUsernameSet(response.profile || { 
          ...userProfile, 
          display_name: username.trim(),
          username_set: true 
        })
      } else {
        toast.error(response.error || "Failed to set username")
      }
    } catch (error: any) {
      console.error('Username setting error:', error)
      toast.error("Failed to set username. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const walletAddress = userProfile?.wallet_address || userProfile?.user_id

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Welcome to OpenLearnX! 🎓
          </CardTitle>
          
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 p-4 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-purple-600" />
              <Badge variant="secondary" className="bg-purple-600 text-white">
                MetaMask Connected
              </Badge>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
              {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Choose Your Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              maxLength={25}
              disabled={isSubmitting}
            />
            
            <div className="text-xs text-gray-500 space-y-1">
              <p>• 3-25 characters</p>
              <p>• Letters, numbers, and underscores recommended</p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              What you'll get:
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Personalized learning dashboard</li>
              <li>• Global leaderboard ranking</li>
              <li>• Blockchain-verified achievements</li>
              <li>• Community interaction</li>
            </ul>
          </div>

          <Button
            onClick={handleSubmitUsername}
            disabled={!username.trim() || username.length < 3 || isSubmitting}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting Username...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Set Username & Continue
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
