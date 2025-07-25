"use client"

import Link from "next/link"
import type { Module } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CheckCircle2 } from "lucide-react"

interface CourseSidebarProps {
  courseId: string
  modules: Module[]
  activeLessonId: string
}

export function CourseSidebar({ courseId, modules, activeLessonId }: CourseSidebarProps) {
  return (
    <div className="w-full md:w-64 lg:w-80 flex-shrink-0 border-r bg-gray-50 dark:bg-gray-900 p-4 overflow-y-auto">
      <h2 className="text-lg font-bold text-primary-purple mb-4">Course Content</h2>
      <nav className="space-y-4">
        {modules.map((module) => (
          <div key={module.id}>
            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-2">{module.title}</h3>
            <ul className="space-y-1">
              {module.lessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={`/courses/${courseId}/lesson/${lesson.id}`}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md text-sm transition-colors",
                      activeLessonId === lesson.id
                        ? "bg-primary-blue text-white"
                        : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700",
                    )}
                  >
                    {lesson.completed && <CheckCircle2 className="h-4 w-4 text-success" />}
                    <span>{lesson.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  )
}
