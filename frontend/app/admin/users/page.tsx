"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

type UserDoc = Record<string, unknown>

type UserFormState = {
  email: string
  username: string
  name: string
  wallet_address: string
  role: string
  password: string
}

const API_BASE = "http://127.0.0.1:5000"

const initialUserForm: UserFormState = {
  email: "",
  username: "",
  name: "",
  wallet_address: "",
  role: "student",
  password: "",
}

const getUserId = (user: UserDoc) => String(user._id || user.id || "")

export default function AdminUsersPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string>("")
  const [users, setUsers] = useState<UserDoc[]>([])
  const [selectedUser, setSelectedUser] = useState<UserDoc | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 })
  const [message, setMessage] = useState("")

  const [createForm, setCreateForm] = useState<UserFormState>(initialUserForm)
  const [editMode, setEditMode] = useState(false)
  const [editId, setEditId] = useState("")
  const [editForm, setEditForm] = useState<UserFormState>(initialUserForm)

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

  const fetchUsers = async (page = 1, nextSearch = search, nextStatus = statusFilter, nextRole = roleFilter) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.limit),
      })

      if (nextSearch.trim()) params.set("search", nextSearch.trim())
      if (nextStatus !== "all") params.set("status", nextStatus)
      if (nextRole !== "all") params.set("role", nextRole)

      const resp = await fetch(`${API_BASE}/api/admin/users?${params.toString()}`, { headers: headers() })
      if (!resp.ok) {
        setUsers([])
        setMessage("Failed to load users.")
        return
      }

      const data = await resp.json()
      setUsers(Array.isArray(data.users) ? data.users : [])
      if (data.pagination) setPagination(data.pagination)
      setMessage("")
    } catch {
      setUsers([])
      setMessage("Network error while loading users.")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage("")

    try {
      const payload: Record<string, unknown> = {
        email: createForm.email.trim(),
        username: createForm.username.trim(),
        name: createForm.name.trim(),
        wallet_address: createForm.wallet_address.trim(),
        role: createForm.role,
      }

      if (createForm.password.trim()) payload.password = createForm.password

      const resp = await fetch(`${API_BASE}/api/admin/users`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload),
      })

      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        setMessage(String(data.error || "Failed to create user."))
        return
      }

      setCreateForm(initialUserForm)
      setMessage("User created successfully.")
      await fetchUsers(1)
    } catch {
      setMessage("Network error while creating user.")
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (user: UserDoc) => {
    setEditMode(true)
    setEditId(getUserId(user))
    setEditForm({
      email: String(user.email || ""),
      username: String(user.username || ""),
      name: String(user.name || ""),
      wallet_address: String(user.wallet_address || ""),
      role: String(user.role || "student"),
      password: "",
    })
  }

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editId) return

    setSaving(true)
    setMessage("")

    try {
      const payload: Record<string, unknown> = {
        email: editForm.email.trim(),
        username: editForm.username.trim(),
        name: editForm.name.trim(),
        wallet_address: editForm.wallet_address.trim(),
        role: editForm.role,
      }
      if (editForm.password.trim()) payload.password = editForm.password

      const resp = await fetch(`${API_BASE}/api/admin/users/${editId}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(payload),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        setMessage(String(data.error || "Failed to update user."))
        return
      }

      setEditMode(false)
      setEditId("")
      setEditForm(initialUserForm)
      setMessage("User updated successfully.")
      await fetchUsers(pagination.page)
    } catch {
      setMessage("Network error while updating user.")
    } finally {
      setSaving(false)
    }
  }

  const quickAction = async (
    userId: string,
    action: "suspend" | "ban" | "activate" | "delete" | "reset-password",
    role?: string,
  ) => {
    if (!userId) return

    setActionLoadingId(`${userId}:${action}`)
    setMessage("")

    try {
      let endpoint = `${API_BASE}/api/admin/users/${userId}/${action}`
      let method: "POST" | "DELETE" = "POST"
      let body: string | undefined

      if (action === "delete") method = "DELETE"
      if (action === "reset-password") body = JSON.stringify({ new_password: "TempPass@123" })
      if (action === "suspend" || action === "ban" || action === "activate") {
        endpoint = `${API_BASE}/api/admin/users/${userId}/status`
        const statusMap: Record<string, string> = { suspend: "suspended", ban: "banned", activate: "active" }
        body = JSON.stringify({ status: statusMap[action] })
      }
      if (role) {
        endpoint = `${API_BASE}/api/admin/users/${userId}/role`
        body = JSON.stringify({ role })
      }

      const resp = await fetch(endpoint, {
        method,
        headers: headers(),
        body,
      })

      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        setMessage(String(data.error || "Action failed."))
        return
      }

      setMessage(role ? `Role updated to ${role}.` : `User action ${action} completed.`)
      await fetchUsers(pagination.page)
    } catch {
      setMessage("Network error while running action.")
    } finally {
      setActionLoadingId("")
    }
  }

  const roleSet = useMemo(() => {
    const roles = new Set<string>()
    for (const user of users) {
      const value = String(user.role || "").trim()
      if (value) roles.add(value)
    }
    return Array.from(roles)
  }, [users])

  useEffect(() => {
    const init = async () => {
      const ok = await ensureAuth()
      if (!ok) return
      setReady(true)
      await fetchUsers(1)
    }
    init()
  }, [])

  if (!ready) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-300">Loading users...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">User Management</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage accounts, roles, access status, and student progress from real database records.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={handleCreateUser}
          className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Create User</h2>
          <input
            value={createForm.email}
            onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="Email"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <input
            value={createForm.username}
            onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))}
            placeholder="Username"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <input
            value={createForm.name}
            onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Full name"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <input
            value={createForm.wallet_address}
            onChange={(e) => setCreateForm((p) => ({ ...p, wallet_address: e.target.value }))}
            placeholder="Wallet address"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <select
            value={createForm.role}
            onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="student">student</option>
            <option value="instructor">instructor</option>
            <option value="admin">admin</option>
          </select>
          <input
            value={createForm.password}
            onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
            placeholder="Password (optional)"
            type="password"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Create User"}
          </button>
        </form>

        <form
          onSubmit={submitEdit}
          className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Edit User</h2>
          {!editMode ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">Select a user from the table to edit details.</p>
          ) : (
            <>
              <input
                value={editForm.email}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="Email"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              <input
                value={editForm.username}
                onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))}
                placeholder="Username"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Full name"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              <input
                value={editForm.wallet_address}
                onChange={(e) => setEditForm((p) => ({ ...p, wallet_address: e.target.value }))}
                placeholder="Wallet address"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              <select
                value={editForm.role}
                onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="student">student</option>
                <option value="instructor">instructor</option>
                <option value="admin">admin</option>
              </select>
              <input
                value={editForm.password}
                onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Set new password (optional)"
                type="password"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false)
                    setEditId("")
                    setEditForm(initialUserForm)
                  }}
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-4 dark:border-gray-800">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, username, full name"
            className="min-w-[220px] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="all">All roles</option>
            <option value="student">student</option>
            <option value="instructor">instructor</option>
            <option value="admin">admin</option>
            {roleSet
              .filter((r) => r !== "student" && r !== "instructor" && r !== "admin")
              .map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
          </select>
          <button
            onClick={() => fetchUsers(1, search, statusFilter, roleFilter)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Apply
          </button>
        </div>

        {message ? (
          <div className="border-b border-gray-100 px-4 py-2 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200">
            {message}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Email</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Username</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Role</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Progress</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-sm text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => {
                  const userId = getUserId(user)
                  const status = String(user.status || "active")
                  const progress = Number(user.progress_percent || user.progress || 0)

                  return (
                    <tr key={userId || String(idx)}>
                      <td className="px-3 py-2 text-xs text-gray-800 dark:text-gray-100">{String(user.email || "-")}</td>
                      <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{String(user.username || user.name || "-")}</td>
                      <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{String(user.role || "student")}</td>
                      <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{status}</td>
                      <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{Number.isFinite(progress) ? `${progress}%` : "0%"}</td>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="rounded bg-gray-100 px-2 py-1 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                          >
                            View
                          </button>
                          <button
                            onClick={() => startEdit(user)}
                            className="rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            disabled={actionLoadingId === `${userId}:suspend`}
                            onClick={() => quickAction(userId, "suspend")}
                            className="rounded bg-amber-600 px-2 py-1 text-white hover:bg-amber-700 disabled:opacity-60"
                          >
                            Suspend
                          </button>
                          <button
                            disabled={actionLoadingId === `${userId}:ban`}
                            onClick={() => quickAction(userId, "ban")}
                            className="rounded bg-rose-600 px-2 py-1 text-white hover:bg-rose-700 disabled:opacity-60"
                          >
                            Ban
                          </button>
                          <button
                            disabled={actionLoadingId === `${userId}:activate`}
                            onClick={() => quickAction(userId, "activate")}
                            className="rounded bg-emerald-600 px-2 py-1 text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            Activate
                          </button>
                          <button
                            disabled={actionLoadingId === `${userId}:reset-password`}
                            onClick={() => quickAction(userId, "reset-password")}
                            className="rounded bg-purple-600 px-2 py-1 text-white hover:bg-purple-700 disabled:opacity-60"
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => quickAction(userId, "activate", "student")}
                            className="rounded bg-slate-600 px-2 py-1 text-white hover:bg-slate-700"
                          >
                            Set Student
                          </button>
                          <button
                            onClick={() => quickAction(userId, "activate", "instructor")}
                            className="rounded bg-slate-600 px-2 py-1 text-white hover:bg-slate-700"
                          >
                            Set Instructor
                          </button>
                          <button
                            onClick={() => quickAction(userId, "activate", "admin")}
                            className="rounded bg-slate-900 px-2 py-1 text-white hover:bg-black"
                          >
                            Set Admin
                          </button>
                          <button
                            disabled={actionLoadingId === `${userId}:delete`}
                            onClick={() => quickAction(userId, "delete")}
                            className="rounded bg-red-800 px-2 py-1 text-white hover:bg-red-900 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
          <span>
            Page {pagination.page} of {pagination.pages} | Total {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchUsers(Math.max(1, pagination.page - 1), search, statusFilter, roleFilter)}
              disabled={pagination.page <= 1}
              className="rounded bg-gray-100 px-3 py-1.5 disabled:opacity-50 dark:bg-gray-800"
            >
              Previous
            </button>
            <button
              onClick={() => fetchUsers(Math.min(pagination.pages, pagination.page + 1), search, statusFilter, roleFilter)}
              disabled={pagination.page >= pagination.pages}
              className="rounded bg-gray-100 px-3 py-1.5 disabled:opacity-50 dark:bg-gray-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Full User Document</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
            <pre className="max-h-[70vh] overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-800 dark:bg-gray-950 dark:text-gray-100">
              {JSON.stringify(selectedUser, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  )
}
