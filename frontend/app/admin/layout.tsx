"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState, type ComponentType } from "react"
import { BarChart3, BookOpen, Database, FileText, LayoutDashboard, LogOut, Shield, Users } from "lucide-react"

type NavItem = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/logs", label: "Logs", icon: FileText },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/database", label: "Database", icon: Database },
  { href: "/admin/firewall", label: "Firewall", icon: Shield },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  const isLoginPage = useMemo(() => pathname === "/admin/login", [pathname])

  useEffect(() => {
    setReady(true)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("admin_token")
    router.push("/admin/login")
  }

  if (!ready) return null
  if (isLoginPage) return <>{children}</>

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
      <div className="flex w-full">
        <aside className="sticky top-0 h-screen w-72 shrink-0 border-r border-gray-200 bg-white/90 p-5 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/90">
          <div className="mb-6 border-b border-gray-200 pb-4 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">OpenLearnX Admin</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Professional control panel</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <BarChart3 className="h-4 w-4" />
              <p className="text-xs font-medium">Live Data Enabled</p>
            </div>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Stats, logs, and actions are loaded directly from backend collections.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </aside>

        <section className="min-w-0 flex-1 p-5 lg:p-7">{children}</section>
      </div>
    </div>
  )
}
