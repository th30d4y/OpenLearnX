"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, ShieldCheck } from "lucide-react"

type DashboardStats = {
  total_courses: number
  total_lessons: number
  total_modules?: number
  total_users?: number
  total_logs?: number
  active_students: number
  completion_rate: number
}

type LogItem = {
  id: string
  timestamp: string
  event_type: string
  action: string
  status_code: number
  ip: string
  path: string
}

type ChartPoint = {
  label: string
  value: number
}

type DashboardCharts = {
  events: ChartPoint[]
  status_codes: ChartPoint[]
  methods: ChartPoint[]
}

const API_BASE = "http://127.0.0.1:5000"

export default function AdminDashboardPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    total_courses: 0,
    total_lessons: 0,
    total_modules: 0,
    total_users: 0,
    total_logs: 0,
    active_students: 0,
    completion_rate: 0,
  })
  const [recentLogs, setRecentLogs] = useState<LogItem[]>([])
  const [recentActions, setRecentActions] = useState<LogItem[]>([])
  const [alertsCount, setAlertsCount] = useState(0)
  const [charts, setCharts] = useState<DashboardCharts>({ events: [], status_codes: [], methods: [] })

  const getToken = () => localStorage.getItem("admin_token")

  const headers = () => {
    const token = getToken()
    return token
      ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      : { "Content-Type": "application/json" }
  }

  const verifyAuth = async () => {
    const token = getToken()
    if (!token) {
      router.push("/admin/login")
      return false
    }

    const resp = await fetch(`${API_BASE}/api/admin/test`, { headers: headers() })
    if (!resp.ok) {
      localStorage.removeItem("admin_token")
      router.push("/admin/login")
      return false
    }

    return true
  }

  const fetchDashboardData = async () => {
    const [statsResp, logsResp, actionsResp, alertsResp, chartsResp] = await Promise.all([
      fetch(`${API_BASE}/api/admin/dashboard`, { headers: headers() }),
      fetch(`${API_BASE}/api/admin/logs?limit=8`, { headers: headers() }),
      fetch(`${API_BASE}/api/admin/recent-actions?limit=8`, { headers: headers() }),
      fetch(`${API_BASE}/api/admin/alerts?limit=50`, { headers: headers() }),
      fetch(`${API_BASE}/api/admin/analytics/activity`, { headers: headers() }),
    ])

    if (statsResp.ok) {
      const data = await statsResp.json()
      setStats({
        total_courses: Number(data.total_courses || 0),
        total_lessons: Number(data.total_lessons || 0),
        total_modules: Number(data.total_modules || 0),
        total_users: Number(data.total_users || 0),
        total_logs: Number(data.total_logs || 0),
        active_students: Number(data.active_students || 0),
        completion_rate: Number(data.completion_rate || 0),
      })
    }

    if (logsResp.ok) {
      const data = await logsResp.json()
      setRecentLogs(Array.isArray(data.logs) ? data.logs : [])
    }

    if (actionsResp.ok) {
      const data = await actionsResp.json()
      setRecentActions(Array.isArray(data.actions) ? data.actions : [])
    }

    if (alertsResp.ok) {
      const data = await alertsResp.json()
      setAlertsCount(Number(data.count || 0))
    }

    if (chartsResp.ok) {
      const data = await chartsResp.json()
      if (data.charts) {
        setCharts({
          events: Array.isArray(data.charts.events) ? data.charts.events : [],
          status_codes: Array.isArray(data.charts.status_codes) ? data.charts.status_codes : [],
          methods: Array.isArray(data.charts.methods) ? data.charts.methods : [],
        })
      }
    }
  }

  useEffect(() => {
    const init = async () => {
      const ok = await verifyAuth()
      if (!ok) return
      setReady(true)
      await fetchDashboardData()
    }
    init()
  }, [])

  if (!ready) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-300">Loading admin dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Real-time operational metrics sourced from database collections.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
        <StatCard label="Total Courses" value={stats.total_courses} color="text-blue-600" />
        <StatCard label="Total Modules" value={stats.total_modules || 0} color="text-indigo-600" />
        <StatCard label="Total Lessons" value={stats.total_lessons} color="text-violet-600" />
        <StatCard label="Total Users" value={stats.total_users || 0} color="text-cyan-600" />
        <StatCard label="Traffic (Logs)" value={stats.total_logs || 0} color="text-fuchsia-600" />
        <StatCard label="Active Students" value={stats.active_students} color="text-emerald-600" />
        <StatCard label="Security Alerts" value={alertsCount} color="text-rose-600" />
        <StatCard label="Completion Rate" value={`${stats.completion_rate}%`} color="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard title="Top Events" data={charts.events.slice(0, 6)} />
        <ChartCard title="HTTP Status" data={charts.status_codes.slice(0, 6)} />
        <ChartCard title="Request Methods" data={charts.methods.slice(0, 6)} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Security and Activity Logs</h2>
            <Link href="/admin/logs" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Open Logs
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Event</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Action</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs font-medium text-gray-800 dark:text-gray-100">{log.event_type}</td>
                    <td className="px-4 py-2 text-xs text-gray-700 dark:text-gray-300">{log.action}</td>
                    <td className="px-4 py-2 text-xs">
                      <span className={`rounded px-2 py-1 ${log.status_code >= 400 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {log.status_code}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">Quick Actions</h3>
          </div>
          <div className="space-y-3">
            <QuickLink href="/admin/courses" title="Manage Courses" subtitle="Create, update and organize curriculum" />
            <QuickLink href="/admin/users" title="Browse Users" subtitle="View complete user records from database" />
            <QuickLink href="/admin/logs" title="Inspect Logs" subtitle="Filter auth, security and activity events" />
            <QuickLink href="/admin/database" title="Explore Database" subtitle="Browse all collections and documents" />
            <QuickLink href="/admin/reports" title="Reports and Analytics" subtitle="Usage, security and exports (CSV/JSON)" />
            <QuickLink href="/admin/firewall" title="Firewall Rules" subtitle="Manually add/remove blocking rules" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Actions</h2>
          <Link href="/admin/logs" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Open Full Logs
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Time</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Event</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Action</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">IP</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentActions.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-xs text-gray-700 dark:text-gray-300">{new Date(item.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs font-medium text-gray-900 dark:text-white">{item.event_type}</td>
                  <td className="px-4 py-2 text-xs text-gray-700 dark:text-gray-300">{item.action}</td>
                  <td className="px-4 py-2 text-xs text-gray-700 dark:text-gray-300">{item.ip}</td>
                  <td className="px-4 py-2 text-xs text-gray-700 dark:text-gray-300">{item.status_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  )
}

function QuickLink({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"
    >
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400">{subtitle}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-blue-600" />
    </Link>
  )
}

function ChartCard({ title, data }: { title: string; data: ChartPoint[] }) {
  const max = Math.max(...data.map((x) => x.value), 1)
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      <div className="mt-4 space-y-3">
        {data.length === 0 ? (
          <p className="text-xs text-gray-500">No data</p>
        ) : (
          data.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                <span className="font-medium text-gray-900 dark:text-white">{item.value}</span>
              </div>
              <div className="h-2 rounded bg-gray-100 dark:bg-gray-700">
                <div className="h-2 rounded bg-blue-600" style={{ width: `${(item.value / max) * 100}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
