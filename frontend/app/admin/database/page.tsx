"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type CollectionInfo = { name: string; count: number }
type DocumentRow = Record<string, unknown>

const API_BASE = "http://127.0.0.1:5000"

export default function AdminDatabasePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [collections, setCollections] = useState<CollectionInfo[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>("")
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [search, setSearch] = useState("")
  const [loadingCollections, setLoadingCollections] = useState(false)
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 })
  const [createJson, setCreateJson] = useState('{\n  "key": "value"\n}')
  const [editDocId, setEditDocId] = useState("")
  const [editJson, setEditJson] = useState("{}")

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

  const fetchOverview = async () => {
    setLoadingCollections(true)
    setMessage("")
    try {
      const resp = await fetch(`${API_BASE}/api/admin/database/overview`, { headers: headers() })
      if (resp.ok) {
        const data = await resp.json()
        const list = Array.isArray(data.collections) ? data.collections : []
        setCollections(list)
        if (list.length > 0 && !selectedCollection) {
          setSelectedCollection(list[0].name)
          await fetchDocuments(list[0].name, 1)
        }
      } else {
        const data = await resp.json().catch(() => ({}))
        setMessage(String(data.error || "Failed to load collections."))
      }
    } catch {
      setMessage("Network error while loading collections.")
    } finally {
      setLoadingCollections(false)
    }
  }

  const fetchDocuments = async (collection: string, page = 1, nextSearch = search) => {
    if (!collection) return
    setLoadingDocuments(true)
    setMessage("")
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pagination.limit) })
      if (nextSearch.trim()) params.set("search", nextSearch.trim())

      const resp = await fetch(`${API_BASE}/api/admin/database/collections/${encodeURIComponent(collection)}?${params.toString()}`, { headers: headers() })
      if (resp.ok) {
        const data = await resp.json()
        setDocuments(Array.isArray(data.documents) ? data.documents : [])
        if (data.pagination) setPagination(data.pagination)
      } else {
        const data = await resp.json().catch(() => ({}))
        setMessage(String(data.error || "Failed to load documents."))
        setDocuments([])
      }
    } catch {
      setMessage("Network error while loading documents.")
      setDocuments([])
    } finally {
      setLoadingDocuments(false)
    }
  }

  const createDocument = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedCollection) return

    setSaving(true)
    setMessage("")

    try {
      const payload = JSON.parse(createJson)
      const resp = await fetch(`${API_BASE}/api/admin/database/collections/${encodeURIComponent(selectedCollection)}`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload),
      })
      const data = await resp.json().catch(() => ({}))

      if (!resp.ok) {
        setMessage(String(data.error || "Failed to create document."))
        return
      }

      setMessage("Document created successfully.")
      await fetchOverview()
      await fetchDocuments(selectedCollection, 1)
    } catch {
      setMessage("Invalid JSON for create payload.")
    } finally {
      setSaving(false)
    }
  }

  const startEditDocument = (doc: DocumentRow) => {
    const id = String(doc._id || "")
    if (!id) {
      setMessage("Selected document has no _id.")
      return
    }

    const clone = { ...doc }
    delete clone._id
    setEditDocId(id)
    setEditJson(JSON.stringify(clone, null, 2))
  }

  const saveEditDocument = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedCollection || !editDocId) return

    setSaving(true)
    setMessage("")

    try {
      const payload = JSON.parse(editJson)
      const resp = await fetch(
        `${API_BASE}/api/admin/database/collections/${encodeURIComponent(selectedCollection)}/${encodeURIComponent(editDocId)}`,
        {
          method: "PUT",
          headers: headers(),
          body: JSON.stringify(payload),
        },
      )
      const data = await resp.json().catch(() => ({}))

      if (!resp.ok) {
        setMessage(String(data.error || "Failed to update document."))
        return
      }

      setMessage("Document updated successfully.")
      setEditDocId("")
      setEditJson("{}")
      await fetchDocuments(selectedCollection, pagination.page)
    } catch {
      setMessage("Invalid JSON for update payload.")
    } finally {
      setSaving(false)
    }
  }

  const deleteDocument = async (docId: string) => {
    if (!selectedCollection || !docId) return

    setSaving(true)
    setMessage("")
    try {
      const resp = await fetch(
        `${API_BASE}/api/admin/database/collections/${encodeURIComponent(selectedCollection)}/${encodeURIComponent(docId)}`,
        {
          method: "DELETE",
          headers: headers(),
        },
      )
      const data = await resp.json().catch(() => ({}))

      if (!resp.ok) {
        setMessage(String(data.error || "Failed to delete document."))
        return
      }

      setMessage("Document deleted successfully.")
      await fetchOverview()
      await fetchDocuments(selectedCollection, 1)
    } catch {
      setMessage("Network error while deleting document.")
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      const ok = await ensureAuth()
      if (!ok) return
      setReady(true)
      await fetchOverview()
    }
    init()
  }, [])

  if (!ready) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-300">Loading database explorer...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Database Explorer</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Browse all collections and perform create, update, and delete actions on documents.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={createDocument}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Create Document</h3>
          <p className="mb-2 text-xs text-gray-600 dark:text-gray-300">Collection: {selectedCollection || "None selected"}</p>
          <textarea
            value={createJson}
            onChange={(e) => setCreateJson(e.target.value)}
            rows={10}
            className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-800"
          />
          <button
            type="submit"
            disabled={saving || !selectedCollection}
            className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Create"}
          </button>
        </form>

        <form
          onSubmit={saveEditDocument}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Edit Document</h3>
          <p className="mb-2 text-xs text-gray-600 dark:text-gray-300">Document ID: {editDocId || "Select a document below"}</p>
          <textarea
            value={editJson}
            onChange={(e) => setEditJson(e.target.value)}
            rows={10}
            className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-800"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={saving || !selectedCollection || !editDocId}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Update"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditDocId("")
                setEditJson("{}")
              }}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {message ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Collections</h3>
          {loadingCollections ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">Loading...</p>
          ) : (
            <div className="space-y-1">
              {collections.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setSelectedCollection(item.name)
                    fetchDocuments(item.name, 1)
                  }}
                  className={`flex w-full items-center justify-between rounded px-3 py-2 text-sm ${
                    selectedCollection === item.name
                      ? "bg-blue-600 text-white"
                      : "bg-gray-50 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className="truncate text-left">{item.name}</span>
                  <span className="ml-2 text-xs">{item.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-3 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inside documents"
              className="min-w-[260px] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            <button
              onClick={() => fetchDocuments(selectedCollection, 1)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Search
            </button>
          </div>

          <div className="max-h-[72vh] overflow-auto p-4">
            {loadingDocuments ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">Loading documents...</p>
            ) : documents.length === 0 ? (
              <p className="text-sm text-gray-500">No documents to show.</p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc, idx) => (
                  <div
                    key={String(doc._id || idx)}
                    className="rounded border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => startEditDocument(doc)}
                        className="rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteDocument(String(doc._id || ""))}
                        className="rounded bg-red-700 px-2 py-1 text-white hover:bg-red-800"
                      >
                        Delete
                      </button>
                      <span className="text-[11px] text-gray-600 dark:text-gray-300">ID: {String(doc._id || "unknown")}</span>
                    </div>
                    <pre className="overflow-auto">{JSON.stringify(doc, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
            <span>Page {pagination.page} of {pagination.pages} • Total {pagination.total}</span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchDocuments(selectedCollection, Math.max(1, pagination.page - 1))}
                disabled={pagination.page <= 1}
                className="rounded bg-gray-100 px-3 py-1.5 disabled:opacity-50 dark:bg-gray-800"
              >
                Previous
              </button>
              <button
                onClick={() => fetchDocuments(selectedCollection, Math.min(pagination.pages, pagination.page + 1))}
                disabled={pagination.page >= pagination.pages}
                className="rounded bg-gray-100 px-3 py-1.5 disabled:opacity-50 dark:bg-gray-800"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
