"use client"

import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export function MetaMaskConnect() {
  const { user, isLoadingAuth, connectWallet, logout } = useAuth()

  return (
    <div className="flex items-center gap-4">
      {user ? (
        <>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Connected: {user.wallet_address.slice(0, 6)}...
            {user.wallet_address.slice(-4)}
          </span>
          <Button onClick={logout} variant="outline" disabled={isLoadingAuth}>
            Logout
          </Button>
        </>
      ) : (
        <Button onClick={connectWallet} disabled={isLoadingAuth}>
          {isLoadingAuth && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Connect Wallet
        </Button>
      )}
    </div>
  )
}
