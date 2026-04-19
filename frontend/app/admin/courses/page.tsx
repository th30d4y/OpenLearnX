"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Edit, Plus, Trash2 } from "lucide-react"

type Course = {
  id: string
  title: string
  subject: string
  description: string
  difficulty: string
  mentor: string
  video_url: string
  students: number
}

const API_BASE = "http://127.0.0.1:5000"

export default function AdminCoursesPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)

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

  const fetchCourses = async () => {
    setLoading(true)
    try {
      const resp = await fetch(`${API_BASE}/api/admin/courses`, { headers: headers() })
      if (resp.ok) {
        const data = await resp.json()
        setCourses(Array.isArray(data) ? data : [])
      } else {
        setCourses([])
      }
    } catch {
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  const saveCourse = async (payload: Partial<Course>, courseId?: string) => {
    const url = courseId ? `${API_BASE}/api/admin/courses/${courseId}` : `${API_BASE}/api/admin/courses`
    const method = courseId ? "PUT" : "POST"

    const resp = await fetch(url, {
      method,
      headers: headers(),
      body: JSON.stringify(payload),
    })

    if (resp.ok) {
      setShowAdd(false)
      setEditing(null)
      await fetchCourses()
    } else {
      const err = await resp.json().catch(() => ({ error: "Operation failed" }))
      alert(err.error || "Operation failed")
    }
  }

  const deleteCourse = async (courseId: string) => {
    if (!confirm("Delete this course and related modules/lessons?")) return
    const resp = await fetch(`${API_BASE}/api/admin/courses/${courseId}`, {
      method: "DELETE",
      headers: headers(),
    })
    if (resp.ok) {
      await fetchCourses()
    } else {
      alert("Failed to delete course")
    }
  }

  useEffect(() => {
    const init = async () => {
      const ok = await ensureAuth()
      if (!ok) return
      setReady(true)
      await fetchCourses()
    }
    init()
  }, [])

  if (!ready) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-300">Loading course management...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Course Management</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage real courses from database records.</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Course
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Difficulty</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Mentor</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Students</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-sm text-gray-600" colSpan={6}>Loading courses...</td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-sm text-gray-500" colSpan={6}>No courses found.</td>
                </tr>
              ) : (
                courses.map((course) => (
                  <tr key={course.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{course.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{course.subject}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{course.difficulty}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{course.mentor}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{Number(course.students || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditing(course)}
                          className="rounded p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteCourse(course.id)}
                          className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(showAdd || editing) && (
        <CourseFormModal
          title={editing ? "Edit Course" : "Add Course"}
          initialData={editing || undefined}
          onClose={() => {
            setShowAdd(false)
            setEditing(null)
          }}
          onSubmit={(payload) => saveCourse(payload, editing?.id)}
        />
      )}
    </div>
  )
}

function CourseFormModal({
  title,
  initialData,
  onClose,
  onSubmit,
}: {
  title: string
  initialData?: Partial<Course>
  onClose: () => void
  onSubmit: (payload: Partial<Course>) => Promise<void>
}) {
  const [form, setForm] = useState<Partial<Course>>({
    title: initialData?.title || "",
    subject: initialData?.subject || "",
    description: initialData?.description || "",
    difficulty: initialData?.difficulty || "Beginner",
    mentor: initialData?.mentor || "",
    video_url: initialData?.video_url || "",
  })
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSubmit(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <form onSubmit={submit} className="space-y-3">
          <input
            required
            placeholder="Title"
            value={form.title || ""}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <input
            required
            placeholder="Subject"
            value={form.subject || ""}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <textarea
            required
            placeholder="Description"
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            rows={3}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              placeholder="Difficulty"
              value={form.difficulty || ""}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            <input
              placeholder="Mentor"
              value={form.mentor || ""}
              onChange={(e) => setForm({ ...form, mentor: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          <input
            placeholder="Video URL"
            value={form.video_url || ""}
            onChange={(e) => setForm({ ...form, video_url: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
