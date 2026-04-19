"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const API_BASE = "http://127.0.0.1:5000"

type UsageReport = Record<string, string | number>
type SecurityReport = {
  generated_at?: string
  login_attempts?: number
  suspicious_events?: number
  error_events?: number
  blocked_events?: number
  top_ips?: Array<{ ip: string; count: number }>
}

export default function AdminReportsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState("")
  const [usageReport, setUsageReport] = useState<UsageReport>({})
  const [securityReport, setSecurityReport] = useState<SecurityReport>({})

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

  const fetchReports = async () => {
    setLoading(true)
    setMessage("")

    try {
      const [usageResp, securityResp] = await Promise.all([
        fetch(`${API_BASE}/api/admin/reports/usage`, { headers: headers() }),
        fetch(`${API_BASE}/api/admin/reports/security`, { headers: headers() }),
      ])

      const usageData = await usageResp.json().catch(() => ({}))
      const securityData = await securityResp.json().catch(() => ({}))

      if (!usageResp.ok || !securityResp.ok) {
        setMessage(String(usageData.error || securityData.error || "Failed to fetch reports."))
        return
      }

      setUsageReport(usageData.report || {})
      setSecurityReport(securityData.report || {})
    } catch {
      setMessage("Network error while fetching reports.")
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

  const exportReport = async (reportType: "usage" | "security", format: "json" | "csv") => {
    setExporting(true)
    setMessage("")

    try {
      const resp = await fetch(
        `${API_BASE}/api/admin/reports/export?type=${encodeURIComponent(reportType)}&format=${encodeURIComponent(format)}`,
        { headers: headers() },
      )
      const data = await resp.json().catch(() => ({}))

      if (!resp.ok) {
        setMessage(String(data.error || "Export failed."))
        return
      }

      const stamp = new Date().toISOString().replace(/[.:]/g, "-")
      if (format === "json") {
        triggerDownload(JSON.stringify(data, null, 2), `${reportType}-report-${stamp}.json`, "application/json")
      } else {
        triggerDownload(String(data.content || "key,value\n"), `${reportType}-report-${stamp}.csv`, "text/csv")
      }

      setMessage(`${reportType} report exported as ${format.toUpperCase()}.`)
    } catch {
      setMessage("Network error while exporting report.")
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      const ok = await ensureAuth()
      if (!ok) return
      setReady(true)
      await fetchReports()
    }
    init()
  }, [])

  if (!ready) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-300">Loading reports...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Reports and Analytics</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Usage and security reporting with downloadable JSON and CSV exports.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchReports()}
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh Reports"}
          </button>
          <button
            onClick={() => exportReport("usage", "json")}
            disabled={exporting}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Export Usage JSON
          </button>
          <button
            onClick={() => exportReport("usage", "csv")}
            disabled={exporting}
            className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            Export Usage CSV
          </button>
          <button
            onClick={() => exportReport("security", "json")}
            disabled={exporting}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            Export Security JSON
          </button>
          <button
            onClick={() => exportReport("security", "csv")}
            disabled={exporting}
            className="rounded-md bg-indigo-700 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-60"
          >
            Export Security CSV
          </button>
        </div>
        {message ? <p className="mt-3 text-sm text-gray-700 dark:text-gray-200">{message}</p> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Usage Report</h2>
          {loading ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">Loading usage report...</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(usageReport).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded border border-gray-100 px-3 py-2 text-sm dark:border-gray-800">
                  <span className="text-gray-600 dark:text-gray-300">{key}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{String(value)}</span>
                </div>
              ))}
              {Object.keys(usageReport).length === 0 ? (
                <p className="text-sm text-gray-500">No usage data available.</p>
              ) : null}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Security Report</h2>
          {loading ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">Loading security report...</p>
          ) : (
            <div className="space-y-2">
              <div className="rounded border border-gray-100 px-3 py-2 text-sm dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-300">Login attempts:</span>{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">{securityReport.login_attempts || 0}</span>
              </div>
              <div className="rounded border border-gray-100 px-3 py-2 text-sm dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-300">Suspicious events:</span>{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">{securityReport.suspicious_events || 0}</span>
              </div>
              <div className="rounded border border-gray-100 px-3 py-2 text-sm dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-300">Error events:</span>{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">{securityReport.error_events || 0}</span>
              </div>
              <div className="rounded border border-gray-100 px-3 py-2 text-sm dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-300">Blocked by firewall:</span>{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">{securityReport.blocked_events || 0}</span>
              </div>

              <div className="rounded border border-gray-100 p-3 text-sm dark:border-gray-800">
                <p className="mb-2 font-medium text-gray-900 dark:text-gray-100">Top Source IPs</p>
                <div className="space-y-1">
                  {(securityReport.top_ips || []).map((entry) => (
                    <div key={`${entry.ip}-${entry.count}`} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-300">{entry.ip}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{entry.count}</span>
                    </div>
                  ))}
                  {(securityReport.top_ips || []).length === 0 ? (
                    <p className="text-xs text-gray-500">No IP analytics available.</p>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
