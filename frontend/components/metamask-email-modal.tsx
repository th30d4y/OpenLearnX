"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, X } from "lucide-react"
import { toast } from "react-hot-toast"
import api from "@/lib/api"

interface MetaMaskEmailModalProps {
  isOpen: boolean
  walletAddress: string
  token: string
  onSuccess: (user: any) => void
  onCancel: () => void
}

export function MetaMaskEmailModal({
  isOpen,
  walletAddress,
  token,
  onSuccess,
  onCancel,
}: MetaMaskEmailModalProps) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast.error("Please enter your email address")
      return
    }

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      toast.error("Please enter a valid email address")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await api.post(
        "/api/auth/metamask/add-email",
        {
          email: email.toLowerCase(),
          name: name.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.data.success && response.data.user) {
        toast.success("Email saved successfully!")
        onSuccess(response.data.user)
      } else {
        toast.error(response.data.error || "Failed to save email")
      }
    } catch (error: any) {
      console.error("Error saving email:", error)
      toast.error(
        error.response?.data?.error || "Failed to save email address"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xl font-bold">Save Contact Email</CardTitle>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </CardHeader>

        <CardContent>
          <div className="space-y-4 mb-6">
            <p className="text-sm text-gray-600">
              Connected wallet: <span className="font-mono font-semibold">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
            </p>
            <p className="text-sm text-gray-600">
              Add your contact email and name to complete your profile setup.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Display Name (optional)</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="email">Contact Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                We will use this to verify your account and send important updates
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Email"
                )}
              </Button>
              <Button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                variant="outline"
                className="flex-1"
              >
                Skip for Now
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
