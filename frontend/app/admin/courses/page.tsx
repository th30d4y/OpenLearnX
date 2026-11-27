"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Edit, Plus, Trash2, ListTree } from "lucide-react"

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

type Module = {
  id: string
  course_id: string
  title: string
  description?: string
  order: number
}

type Lesson = {
  id: string
  module_id: string
  course_id: string
  title: string
  description?: string
  video_url?: string
  order: number
  duration?: string
  type?: string
}

const API_BASE = "http://127.0.0.1:5000"

export default function AdminCoursesPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)
  const [managing, setManaging] = useState<Course | null>(null)

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
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{course.subject?.trim() || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{course.difficulty?.trim() || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{course.mentor?.trim() || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{Number(course.students || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setManaging(course)}
                          className="rounded p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                          title="Manage modules & lessons"
                        >
                          <ListTree className="h-4 w-4" />
                        </button>
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

      {managing && (
        <CourseContentModal
          course={managing}
          onClose={() => setManaging(null)}
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

function CourseContentModal({
  course,
  onClose,
}: {
  course: Course
  onClose: () => void
}) {
  const [modules, setModules] = useState<Module[]>([])
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Lesson[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [moduleForm, setModuleForm] = useState({
    title: "",
    description: "",
    order: 1,
  })
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null)
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    video_url: "",
    order: 1,
    duration: "",
    type: "video",
  })

  const adminHeaders = () => {
    const token = localStorage.getItem("admin_token")
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as Record<string, string>
  }

  const loadModules = async () => {
    setLoading(true)
    try {
      const resp = await fetch(`${API_BASE}/api/admin/courses/${course.id}/modules`, {
        headers: adminHeaders(),
      })
      if (!resp.ok) {
        setModules([])
        setLessonsByModule({})
        return
      }
      const data = await resp.json()
      const list = Array.isArray(data?.modules) ? data.modules : Array.isArray(data) ? data : []
      list.sort((a: Module, b: Module) => (a.order || 0) - (b.order || 0))
      setModules(list)

      const lessonsMap: Record<string, Lesson[]> = {}
      await Promise.all(
        list.map(async (module: Module) => {
          const lessonsResp = await fetch(`${API_BASE}/api/admin/modules/${module.id}/lessons`, {
            headers: adminHeaders(),
          })
          if (!lessonsResp.ok) {
            lessonsMap[module.id] = []
            return
          }
          const lessonsData = await lessonsResp.json()
          const lessonsList = Array.isArray(lessonsData?.lessons)
            ? lessonsData.lessons
            : Array.isArray(lessonsData)
              ? lessonsData
              : []
          lessonsList.sort((a: Lesson, b: Lesson) => (a.order || 0) - (b.order || 0))
          lessonsMap[module.id] = lessonsList
        })
      )
      setLessonsByModule(lessonsMap)
      setModuleForm((prev) => ({ ...prev, order: list.length + 1 }))
    } finally {
      setLoading(false)
    }
  }

  const createModule = async () => {
    if (!moduleForm.title.trim()) return
    setSaving(true)
    try {
      const resp = await fetch(`${API_BASE}/api/admin/courses/${course.id}/modules`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim(),
          order: Number(moduleForm.order) || 1,
        }),
      })
      if (!resp.ok) {
        alert("Failed to create module")
        return
      }
      setModuleForm({ title: "", description: "", order: moduleForm.order + 1 })
      await loadModules()
    } finally {
      setSaving(false)
    }
  }

  const deleteModule = async (moduleId: string) => {
    if (!confirm("Delete this module and all its lessons?")) return
    const resp = await fetch(`${API_BASE}/api/admin/modules/${moduleId}`, {
      method: "DELETE",
      headers: adminHeaders(),
    })
    if (!resp.ok) {
      alert("Failed to delete module")
      return
    }
    await loadModules()
  }

  const createLesson = async (moduleId: string) => {
    if (!lessonForm.title.trim()) return
    setSaving(true)
    try {
      const resp = await fetch(`${API_BASE}/api/admin/modules/${moduleId}/lessons`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          title: lessonForm.title.trim(),
          description: lessonForm.description.trim(),
          video_url: lessonForm.video_url.trim(),
          order: Number(lessonForm.order) || 1,
          duration: lessonForm.duration.trim() || undefined,
          type: lessonForm.type.trim() || "video",
        }),
      })
      if (!resp.ok) {
        alert("Failed to create lesson")
        return
      }
      setLessonForm({ title: "", description: "", video_url: "", order: lessonForm.order + 1, duration: "", type: "video" })
      setLessonModuleId(null)
      await loadModules()
    } finally {
      setSaving(false)
    }
  }

  const deleteLesson = async (lessonId: string) => {
    if (!confirm("Delete this lesson?")) return
    const resp = await fetch(`${API_BASE}/api/admin/lessons/${lessonId}`, {
      method: "DELETE",
      headers: adminHeaders(),
    })
    if (!resp.ok) {
      alert("Failed to delete lesson")
      return
    }
    await loadModules()
  }

  useEffect(() => {
    loadModules()
  }, [course.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-5xl rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Modules & Lessons</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{course.title}</p>
          </div>
          <button onClick={onClose} className="rounded-md bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700">
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Add Module</h4>
            <div className="mt-3 grid gap-3">
              <input
                placeholder="Module title"
                value={moduleForm.title}
                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              <textarea
                placeholder="Module description"
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                rows={2}
              />
              <input
                placeholder="Order"
                type="number"
                min={1}
                value={moduleForm.order}
                onChange={(e) => setModuleForm({ ...moduleForm, order: Number(e.target.value) || 1 })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              <button
                onClick={createModule}
                disabled={saving}
                className="self-start rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Add Module"}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Modules</h4>
            {loading ? (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Loading modules...</p>
            ) : modules.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">No modules yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {modules.map((module) => (
                  <div key={module.id} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{module.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Order {module.order}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setLessonModuleId(module.id)}
                          className="rounded-md bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700"
                        >
                          Add Lesson
                        </button>
                        <button
                          onClick={() => deleteModule(module.id)}
                          className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 space-y-2">
                      {(lessonsByModule[module.id] || []).map((lesson) => (
                        <div key={lesson.id} className="flex items-center justify-between rounded-md bg-gray-50 px-2 py-1 text-xs dark:bg-gray-800">
                          <span className="text-gray-700 dark:text-gray-300">
                            {lesson.order}. {lesson.title}
                          </span>
                          <button
                            onClick={() => deleteLesson(lesson.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>

                    {lessonModuleId === module.id && (
                      <div className="mt-3 grid gap-2 rounded-md border border-gray-200 p-3 dark:border-gray-700">
                        <input
                          placeholder="Lesson title"
                          value={lessonForm.title}
                          onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                        />
                        <input
                          placeholder="Lesson description"
                          value={lessonForm.description}
                          onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                        />
                        <input
                          placeholder="Video URL"
                          value={lessonForm.video_url}
                          onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                        />
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                          <input
                            placeholder="Order"
                            type="number"
                            min={1}
                            value={lessonForm.order}
                            onChange={(e) => setLessonForm({ ...lessonForm, order: Number(e.target.value) || 1 })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                          />
                          <input
                            placeholder="Duration"
                            value={lessonForm.duration}
                            onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                          />
                          <input
                            placeholder="Type"
                            value={lessonForm.type}
                            onChange={(e) => setLessonForm({ ...lessonForm, type: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => createLesson(module.id)}
                            disabled={saving}
                            className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            {saving ? "Saving..." : "Save Lesson"}
                          </button>
                          <button
                            onClick={() => setLessonModuleId(null)}
                            className="rounded-md bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
