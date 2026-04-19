"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type AdminLog = {
  id: string
  timestamp: string
  event_type: string
  action: string
  status_code: number
  severity: string
  method: string
  ip: string
  path: string
  user_agent?: string
  metadata?: Record<string, unknown>
  request_body?: unknown
  response_body?: unknown
  usage?: Record<string, unknown>
  query?: Record<string, unknown>
  duration_ms?: number
  origin?: string
}

const API_BASE = "http://127.0.0.1:5000"

export default function AdminLogsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState("")
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null)

  const safeJson = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "No data"
    if (typeof value === "string") {
      try {
        return JSON.stringify(JSON.parse(value), null, 2)
      } catch {
        return value
      }
    }
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setMessage("Copied to clipboard")
    } catch {
      setMessage("Copy failed")
    }
  }

  const selectedRequestData = selectedLog
    ? selectedLog.request_body
      ?? (selectedLog.metadata && (selectedLog.metadata as any).request_body)
      ?? (selectedLog.metadata && (selectedLog.metadata as any).request_details)
      ?? selectedLog.query
      ?? null
    : null

  const selectedResponseData = selectedLog
    ? selectedLog.response_body
      ?? (selectedLog.metadata && (selectedLog.metadata as any).response_body)
      ?? (selectedLog.metadata && (selectedLog.metadata as any).response_details)
      ?? null
    : null

  const selectedUsageData = selectedLog
    ? selectedLog.usage
      ?? (selectedLog.metadata && (selectedLog.metadata as any).usage)
      ?? {
          duration_ms: selectedLog.duration_ms ?? 0,
          note: "Usage metrics not captured for this log entry",
        }
    : null
  const [filters, setFilters] = useState({
    event_type: "",
    severity: "",
    status_code: "",
    search: "",
  })
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 })

  const getToken = () => localStorage.getItem("admin_token")
  const headers = () => {
    const token = getToken()
    return token
      ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      : { "Content-Type": "application/json" }
  }

  const ensureAuth = async () => {
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

  const fetchLogs = async (page = 1, nextFilters = filters) => {
    setLoading(true)
    setMessage("")
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("limit", String(pagination.limit))
    if (nextFilters.event_type) params.set("event_type", nextFilters.event_type)
    if (nextFilters.severity) params.set("severity", nextFilters.severity)
    if (nextFilters.status_code) params.set("status_code", nextFilters.status_code)
    if (nextFilters.search) params.set("search", nextFilters.search)

    try {
      const resp = await fetch(`${API_BASE}/api/admin/logs?${params.toString()}`, { headers: headers() })
      if (resp.ok) {
        const data = await resp.json()
        setLogs(Array.isArray(data.logs) ? data.logs : [])
        if (data.pagination) {
          setPagination(data.pagination)
        }
      } else {
        setLogs([])
      }
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const exportLogs = async (format: "json" | "csv") => {
    setExporting(true)
    setMessage("")

    const params = new URLSearchParams()
    params.set("type", "logs")
    params.set("format", format)
    params.set("limit", "5000")
    if (filters.event_type) params.set("event_type", filters.event_type)
    if (filters.severity) params.set("severity", filters.severity)
    if (filters.status_code) params.set("status_code", filters.status_code)
    if (filters.search) params.set("search", filters.search)

    try {
      const resp = await fetch(`${API_BASE}/api/admin/reports/export?${params.toString()}`, { headers: headers() })
      const data = await resp.json().catch(() => ({}))

      if (!resp.ok) {
        setMessage(String(data.error || "Failed to export logs."))
        return
      }

      const stamp = new Date().toISOString().replace(/[.:]/g, "-")
      if (format === "json") {
        triggerDownload(JSON.stringify(data, null, 2), `admin-logs-${stamp}.json`, "application/json")
      } else {
        triggerDownload(String(data.content || ""), `admin-logs-${stamp}.csv`, "text/csv")
      }

      setMessage(`Logs exported as ${format.toUpperCase()}.`)
    } catch {
      setMessage("Network error while exporting logs.")
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      const ok = await ensureAuth()
      if (!ok) return
      setReady(true)
      await fetchLogs(1)
    }
    init()
  }, [])

  if (!ready) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-300">Loading logs...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Security and Activity Logs</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Filter authentication, access-control, suspicious payload, and admin activity events.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => exportLogs("json")}
            disabled={exporting}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Export Logs JSON
          </button>
          <button
            onClick={() => exportLogs("csv")}
            disabled={exporting}
            className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            Export Logs CSV
          </button>
        </div>
        {message ? <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{message}</p> : null}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-3 border-b border-gray-100 p-4 md:grid-cols-6 dark:border-gray-800">
          <input
            placeholder="Search action, path, IP"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="md:col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <select
            value={filters.event_type}
            onChange={(e) => setFilters({ ...filters, event_type: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="">All Event Types</option>
            <option value="admin_panel">Admin Panel</option>
            <option value="admin_panel_visit">Admin Visit</option>
            <option value="signin">Sign In</option>
            <option value="signup">Sign Up</option>
            <option value="course_join">Course Join</option>
            <option value="attendance">Attendance</option>
            <option value="forbidden_access">403 Forbidden</option>
            <option value="suspicious_payload">Suspicious Payload</option>
          </select>
          <select
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="">All Severity</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
          <input
            placeholder="Status code"
            value={filters.status_code}
            onChange={(e) => setFilters({ ...filters, status_code: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(1)}
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Apply
            </button>
            <button
              onClick={() => {
                const reset = { event_type: "", severity: "", status_code: "", search: "" }
                setFilters(reset)
                fetchLogs(1, reset)
              }}
              className="w-full rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Time</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Event</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Action</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">IP</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Path</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-sm text-gray-600" colSpan={6}>Loading logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-sm text-gray-500" colSpan={6}>No logs found for selected filters.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-800/60"
                    title="Click to view request and response details"
                  >
                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-900 dark:text-white">{log.event_type}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{log.action}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`rounded px-2 py-1 ${log.status_code >= 400 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {log.status_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{log.ip}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{log.path}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
          <span>
            Page {pagination.page} of {pagination.pages} • Total {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="rounded bg-gray-100 px-3 py-1.5 disabled:opacity-50 dark:bg-gray-800"
            >
              Previous
            </button>
            <button
              onClick={() => fetchLogs(Math.min(pagination.pages, pagination.page + 1))}
              disabled={pagination.page >= pagination.pages}
              className="rounded bg-gray-100 px-3 py-1.5 disabled:opacity-50 dark:bg-gray-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Log Request and Response Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100"
              >
                Close
              </button>
            </div>

            <div className="max-h-[75vh] space-y-4 overflow-auto p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs font-semibold uppercase text-gray-500">Event</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedLog.event_type}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs font-semibold uppercase text-gray-500">Action</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedLog.action}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs font-semibold uppercase text-gray-500">Path</p>
                  <p className="mt-1 text-sm break-all text-gray-900 dark:text-white">{selectedLog.path}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs font-semibold uppercase text-gray-500">Method and Status</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedLog.method} {selectedLog.status_code}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs font-semibold uppercase text-gray-500">Duration</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {selectedLog.duration_ms ?? (selectedLog.metadata && (selectedLog.metadata as any).duration_ms) ?? 0} ms
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs font-semibold uppercase text-gray-500">Client</p>
                  <p className="mt-1 text-sm break-all text-gray-900 dark:text-white">{selectedLog.ip}</p>
                  <p className="mt-1 text-xs break-all text-gray-600 dark:text-gray-300">{selectedLog.user_agent || "Unknown user agent"}</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-gray-500">Request Body</p>
                  <button
                    onClick={() => copyText(safeJson(selectedRequestData))}
                    className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                  >
                    Copy
                  </button>
                </div>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-50 p-3 text-sm leading-6 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
{safeJson(selectedRequestData)}
                </pre>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-gray-500">Response Body</p>
                  <button
                    onClick={() => copyText(safeJson(selectedResponseData))}
                    className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
                  >
                    Copy
                  </button>
                </div>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-50 p-3 text-sm leading-6 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
{safeJson(selectedResponseData)}
                </pre>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-xs font-semibold uppercase text-gray-500">Usage Monitoring</p>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-50 p-3 text-sm leading-6 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
{safeJson(selectedUsageData)}
                </pre>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-gray-500">Full Metadata</p>
                  <button
                    onClick={() => copyText(safeJson(selectedLog.metadata ?? {}))}
                    className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-800"
                  >
                    Copy
                  </button>
                </div>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-50 p-3 text-sm leading-6 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
{safeJson(selectedLog.metadata ?? {})}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
