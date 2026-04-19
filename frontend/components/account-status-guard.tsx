"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import { useAuth } from "@/context/auth-context"

const BLOCKED_STATUSES = new Set(["suspended", "restricted", "banned"])

export function AccountStatusGuard() {
  const pathname = usePathname()
  const { user, isLoadingAuth, logout } = useAuth()

  const status = useMemo(() => String((user as any)?.status || "active").toLowerCase().trim(), [user])

  const skipGuard = pathname.startsWith("/auth/") || pathname === "/admin/login"
  if (skipGuard || isLoadingAuth || !user) return null
  if (!BLOCKED_STATUSES.has(status)) return null

  const title = status === "banned" ? "Account Banned" : "Account Suspended"
  const message =
    status === "banned"
      ? "Your account is banned. You cannot use OpenLearnX with this account. Contact admin for support."
      : "Your account is suspended. Contact admin to restore access."

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white p-4 dark:bg-slate-950">
      <div className="w-full max-w-xl rounded-2xl border-2 border-red-200 bg-white p-7 text-center shadow-xl dark:border-red-900 dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="mt-2 inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700 dark:bg-red-950 dark:text-red-200">
          Status: {status}
        </p>
        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{message}</p>
        <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">Contact admin.</p>
        <div className="mt-5">
          <button
            onClick={() => logout()}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
