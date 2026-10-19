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

type ExecutionLog = {
  id: string
  timestamp: string
  source?: string
  language: string
  execution_id?: string
  status: string
  exit_code?: number
  execution_time?: number
  memory_used?: number
  blocked?: boolean
  error?: string
  ip?: string
  request_body?: unknown
  response_body?: unknown
  user_agent?: string
}

const API_BASE = "http://127.0.0.1:5000"

export default function AdminLogsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState("")
  const [logView, setLogView] = useState<"security" | "execution">("security")
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([])
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null)
  const [selectedExecutionLog, setSelectedExecutionLog] = useState<ExecutionLog | null>(null)

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
  const [executionFilters, setExecutionFilters] = useState({
    language: "",
    status: "",
    search: "",
  })
  const [executionPagination, setExecutionPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 })

  const getToken = () => localStorage.getItem("admin_token")
  const headers = () => {
    const token = getToken()
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as Record<string, string>
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

  const fetchExecutionLogs = async (page = 1, nextFilters = executionFilters) => {
    setLoading(true)
    setMessage("")
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("limit", String(executionPagination.limit))
    if (nextFilters.language) params.set("language", nextFilters.language)
    if (nextFilters.status) params.set("status", nextFilters.status)
    if (nextFilters.search) params.set("search", nextFilters.search)

    try {
      const resp = await fetch(`${API_BASE}/api/admin/logs/executions?${params.toString()}`, { headers: headers() })
      if (resp.ok) {
        const data = await resp.json()
        setExecutionLogs(Array.isArray(data.logs) ? data.logs : [])
        if (data.pagination) {
          setExecutionPagination(data.pagination)
        }
      } else {
        setExecutionLogs([])
      }
    } catch {
      setExecutionLogs([])
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
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Admin Logs</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Switch between security/activity logs and a separate execution log stream.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setLogView("security")
              setSelectedLog(null)
              setSelectedExecutionLog(null)
              fetchLogs(1)
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium ${logView === "security" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"}`}
          >
            Security and Activity
          </button>
          <button
            onClick={() => {
              setLogView("execution")
              setSelectedLog(null)
              setSelectedExecutionLog(null)
              fetchExecutionLogs(1)
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium ${logView === "execution" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"}`}
          >
            Execution Logs
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {logView === "security" ? (
            <>
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
            </>
          ) : null}
        </div>
        {message ? <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{message}</p> : null}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {logView === "security" ? (
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
        ) : (
        <div className="grid grid-cols-1 gap-3 border-b border-gray-100 p-4 md:grid-cols-5 dark:border-gray-800">
          <input
            placeholder="Search execution id, source, IP"
            value={executionFilters.search}
            onChange={(e) => setExecutionFilters({ ...executionFilters, search: e.target.value })}
            className="md:col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <select
            value={executionFilters.language}
            onChange={(e) => setExecutionFilters({ ...executionFilters, language: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="">All Languages</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="c">C</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
          </select>
          <select
            value={executionFilters.status}
            onChange={(e) => setExecutionFilters({ ...executionFilters, status: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="blocked">Blocked</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => fetchExecutionLogs(1)}
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Apply
            </button>
            <button
              onClick={() => {
                const reset = { language: "", status: "", search: "" }
                setExecutionFilters(reset)
                fetchExecutionLogs(1, reset)
              }}
              className="w-full rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100"
            >
              Clear
            </button>
          </div>
        </div>
        )}

        <div className="overflow-x-auto">
          {logView === "security" ? (
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
          ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Time</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Source</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Language</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Execution ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Time (s)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-sm text-gray-600" colSpan={6}>Loading execution logs...</td>
                </tr>
              ) : executionLogs.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-sm text-gray-500" colSpan={6}>No execution logs found for selected filters.</td>
                </tr>
              ) : (
                executionLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedExecutionLog(log)}
                    className="cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-800/60"
                    title="Click to view execution request and response details"
                  >
                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{log.source || "compiler"}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{log.language}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{log.execution_id || "-"}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`rounded px-2 py-1 ${log.status === "success" ? "bg-green-100 text-green-700" : log.status === "blocked" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{typeof log.execution_time === "number" ? log.execution_time.toFixed(3) : "0.000"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
          <span>
            {logView === "security"
              ? `Page ${pagination.page} of ${pagination.pages} • Total ${pagination.total}`
              : `Page ${executionPagination.page} of ${executionPagination.pages} • Total ${executionPagination.total}`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (logView === "security") fetchLogs(Math.max(1, pagination.page - 1))
                else fetchExecutionLogs(Math.max(1, executionPagination.page - 1))
              }}
              disabled={logView === "security" ? pagination.page <= 1 : executionPagination.page <= 1}
              className="rounded bg-gray-100 px-3 py-1.5 disabled:opacity-50 dark:bg-gray-800"
            >
              Previous
            </button>
            <button
              onClick={() => {
                if (logView === "security") fetchLogs(Math.min(pagination.pages, pagination.page + 1))
                else fetchExecutionLogs(Math.min(executionPagination.pages, executionPagination.page + 1))
              }}
              disabled={logView === "security" ? pagination.page >= pagination.pages : executionPagination.page >= executionPagination.pages}
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

      {selectedExecutionLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Execution Request and Response Details</h2>
              <button
                onClick={() => setSelectedExecutionLog(null)}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100"
              >
                Close
              </button>
            </div>

            <div className="max-h-[75vh] space-y-4 overflow-auto p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs font-semibold uppercase text-gray-500">Source</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedExecutionLog.source || "compiler"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs font-semibold uppercase text-gray-500">Language</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedExecutionLog.language}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs font-semibold uppercase text-gray-500">Execution ID</p>
                  <p className="mt-1 break-all text-sm text-gray-900 dark:text-white">{selectedExecutionLog.execution_id || "-"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs font-semibold uppercase text-gray-500">Status</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedExecutionLog.status}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs font-semibold uppercase text-gray-500">Execution Time</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{typeof selectedExecutionLog.execution_time === "number" ? selectedExecutionLog.execution_time.toFixed(3) : "0.000"} s</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs font-semibold uppercase text-gray-500">Client</p>
                  <p className="mt-1 break-all text-sm text-gray-900 dark:text-white">{selectedExecutionLog.ip || "Unknown"}</p>
                  <p className="mt-1 break-all text-xs text-gray-600 dark:text-gray-300">{selectedExecutionLog.user_agent || "Unknown user agent"}</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-gray-500">Request Body</p>
                  <button
                    onClick={() => copyText(safeJson(selectedExecutionLog.request_body ?? { note: "No request body captured for this execution log" }))}
                    className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                  >
                    Copy
                  </button>
                </div>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-50 p-3 text-sm leading-6 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
{safeJson(selectedExecutionLog.request_body ?? { note: "No request body captured for this execution log" })}
                </pre>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-gray-500">Response Body</p>
                  <button
                    onClick={() => copyText(safeJson(selectedExecutionLog.response_body ?? { note: "No response body captured for this execution log" }))}
                    className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
                  >
                    Copy
                  </button>
                </div>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-50 p-3 text-sm leading-6 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
{safeJson(selectedExecutionLog.response_body ?? { note: "No response body captured for this execution log" })}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
