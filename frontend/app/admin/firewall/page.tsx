"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const API_BASE = "http://127.0.0.1:5000"

type FirewallRule = {
  id: string
  name?: string
  ip?: string
  method?: string
  path_pattern?: string
  action?: string
  enabled?: boolean
  created_at?: string
}

type RuleForm = {
  name: string
  ip: string
  method: string
  path_pattern: string
  action: "block" | "allow"
  enabled: boolean
}

const initialRuleForm: RuleForm = {
  name: "",
  ip: "",
  method: "",
  path_pattern: "",
  action: "block",
  enabled: true,
}

export default function AdminFirewallPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rules, setRules] = useState<FirewallRule[]>([])
  const [message, setMessage] = useState("")
  const [form, setForm] = useState<RuleForm>(initialRuleForm)

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

  const fetchRules = async () => {
    setLoading(true)
    setMessage("")

    try {
      const resp = await fetch(`${API_BASE}/api/admin/firewall/rules`, { headers: headers() })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        setRules([])
        setMessage(String(data.error || "Failed to load firewall rules."))
        return
      }

      setRules(Array.isArray(data.rules) ? data.rules : [])
    } catch {
      setRules([])
      setMessage("Network error while loading firewall rules.")
    } finally {
      setLoading(false)
    }
  }

  const createRule = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage("")

    try {
      const payload = {
        name: form.name.trim(),
        ip: form.ip.trim(),
        method: form.method.trim().toUpperCase(),
        path_pattern: form.path_pattern.trim(),
        action: form.action,
        enabled: form.enabled,
      }

      const resp = await fetch(`${API_BASE}/api/admin/firewall/rules`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload),
      })
      const data = await resp.json().catch(() => ({}))

      if (!resp.ok) {
        setMessage(String(data.error || "Failed to create firewall rule."))
        return
      }

      setForm(initialRuleForm)
      setMessage("Firewall rule created.")
      await fetchRules()
    } catch {
      setMessage("Network error while creating firewall rule.")
    } finally {
      setSaving(false)
    }
  }

  const deleteRule = async (ruleId: string) => {
    if (!ruleId) return

    setMessage("")
    try {
      const resp = await fetch(`${API_BASE}/api/admin/firewall/rules/${encodeURIComponent(ruleId)}`, {
        method: "DELETE",
        headers: headers(),
      })
      const data = await resp.json().catch(() => ({}))

      if (!resp.ok) {
        setMessage(String(data.error || "Failed to delete firewall rule."))
        return
      }

      setMessage("Firewall rule deleted.")
      await fetchRules()
    } catch {
      setMessage("Network error while deleting firewall rule.")
    }
  }

  useEffect(() => {
    const init = async () => {
      const ok = await ensureAuth()
      if (!ok) return
      setReady(true)
      await fetchRules()
    }
    init()
  }, [])

  if (!ready) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-300">Loading firewall manager...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Manual Firewall</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Add or remove manual allow/block rules by IP, method, and path pattern.
        </p>
      </div>

      <form
        onSubmit={createRule}
        className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:grid-cols-6"
      >
        <input
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Rule name"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
        <input
          value={form.ip}
          onChange={(e) => setForm((p) => ({ ...p, ip: e.target.value }))}
          placeholder="IP (optional)"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
        <input
          value={form.method}
          onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}
          placeholder="Method (GET/POST...)"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
        <input
          value={form.path_pattern}
          onChange={(e) => setForm((p) => ({ ...p, path_pattern: e.target.value }))}
          placeholder="Path pattern (optional)"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
        <select
          value={form.action}
          onChange={(e) => setForm((p) => ({ ...p, action: e.target.value as "block" | "allow" }))}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="block">block</option>
          <option value="allow">allow</option>
        </select>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Adding..." : "Add Rule"}
        </button>

        <label className="col-span-full inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
          />
          Rule enabled
        </label>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Active Rules</h2>
          {message ? <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{message}</p> : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">IP</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Method</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Path Pattern</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Enabled</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Created</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                    Loading rules...
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-sm text-gray-500">
                    No firewall rules configured.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="px-3 py-2 text-xs text-gray-800 dark:text-gray-100">{rule.name || "-"}</td>
                    <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{rule.ip || "-"}</td>
                    <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{rule.method || "-"}</td>
                    <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{rule.path_pattern || "-"}</td>
                    <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{rule.action || "block"}</td>
                    <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{rule.enabled ? "true" : "false"}</td>
                    <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{String(rule.created_at || "-")}</td>
                    <td className="px-3 py-2 text-xs">
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="rounded bg-red-700 px-2 py-1 text-white hover:bg-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
