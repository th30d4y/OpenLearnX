"use client"

import Link from "next/link"
import { AuthButtons } from "@/components/auth-buttons" // Renamed from MetaMaskConnect
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"

export function Navbar() {
  const { user, firebaseUser, authMethod } = useAuth() // Use authMethod to determine display
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur-md dark:bg-gray-950/80">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-primary-purple">
          OpenLearnX
        </Link>
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href="/"
            className="text-sm font-medium text-gray-600 hover:text-primary-blue dark:text-gray-300 dark:hover:text-primary-blue"
          >
            Home
          </Link>
          <Link
            href="/courses"
            className="text-sm font-medium text-gray-600 hover:text-primary-blue dark:text-gray-300 dark:hover:text-primary-blue"
          >
            Courses
          </Link>
          <Link
            href="/coding"
            className="text-sm font-medium text-gray-600 hover:text-primary-blue dark:text-gray-300 dark:hover:text-primary-blue"
          >
            Coding Practice
          </Link>
          <Link
            href="/quizzes"
            className="text-sm font-medium text-gray-600 hover:text-primary-blue dark:text-gray-300 dark:hover:text-primary-blue"
          >
            Quizzes
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-600 hover:text-primary-blue dark:text-gray-300 dark:hover:text-primary-blue"
          >
            Dashboard
          </Link>
          <AuthButtons /> {/* Use the new AuthButtons component */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="ml-2"
          >
            {mounted && (theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />)}
            {!mounted && <div className="h-5 w-5" />} {/* Render a placeholder div to maintain layout */}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </nav>
        <div className="md:hidden flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="mr-2"
          >
            {mounted && (theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />)}
            {!mounted && <div className="h-5 w-5" />} {/* Render a placeholder div to maintain layout */}
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[250px] sm:w-[300px] p-4 dark:bg-gray-900">
              <nav className="flex flex-col gap-4">
                <Link
                  href="/"
                  className="text-lg font-medium text-gray-800 hover:text-primary-blue dark:text-gray-200 dark:hover:text-primary-blue"
                >
                  Home
                </Link>
                <Link
                  href="/courses"
                  className="text-lg font-medium text-gray-800 hover:text-primary-blue dark:text-gray-200 dark:hover:text-primary-blue"
                >
                  Courses
                </Link>
                <Link
                  href="/coding"
                  className="text-lg font-medium text-gray-800 hover:text-primary-blue dark:text-gray-200 dark:hover:text-primary-blue"
                >
                  Coding Practice
                </Link>
                <Link
                  href="/quizzes"
                  className="text-lg font-medium text-gray-800 hover:text-primary-blue dark:text-gray-200 dark:hover:text-primary-blue"
                >
                  Quizzes
                </Link>
                <Link
                  href="/dashboard"
                  className="text-lg font-medium text-gray-800 hover:text-primary-blue dark:text-gray-200 dark:hover:text-primary-blue"
                >
                  Dashboard
                </Link>
                <div className="mt-4">
                  <AuthButtons />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
