"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import type { CodingProblem, CodeExecutionResult } from "@/lib/types"
import { CodeEditor } from "./code-editor"
import { TestResultsPanel } from "./test-results-panel"
import { SolutionTabs } from "./solution-tabs"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { api } from "@/lib/api" // Import api

interface CodingProblemViewProps {
  problemId: string
}

export function CodingProblemView({ problemId }: CodingProblemViewProps) {
  const { user, firebaseUser, isLoadingAuth, authMethod, token } = useAuth() // Check token for access
  const router = useRouter()
  const [problem, setProblem] = useState<CodingProblem | null>(null)
  const [code, setCode] = useState<string>("")
  const [language, setLanguage] = useState<string>("python") // Default language
  const [executionResults, setExecutionResults] = useState<CodeExecutionResult | null>(null)
  const [isLoadingProblem, setIsLoadingProblem] = useState(true)
  const [isExecutingCode, setIsExecutingCode] = useState(false)
  const [isSubmittingSolution, setIsSubmittingSolution] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const availableLanguages = ["python", "javascript", "java"] // Example languages

  useEffect(() => {
    if (!isLoadingAuth && !user && !firebaseUser) {
      // Allow either MetaMask or Firebase user
      toast.error("Please login to view coding problems.")
      router.push("/")
      return
    }

    const fetchProblem = async () => {
      setIsLoadingProblem(true)
      setError(null)
      try {
        const response = await api.get<CodingProblem>(`/api/coding/problems/${problemId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        setProblem(response.data)
        if (response.data.initial_code[language]) {
          setCode(response.data.initial_code[language])
        } else if (Object.keys(response.data.initial_code).length > 0) {
          const firstLang = Object.keys(response.data.initial_code)[0]
          setLanguage(firstLang)
          setCode(response.data.initial_code[firstLang])
        }
      } catch (err: any) {
        console.error("Failed to fetch coding problem:", err)
        setError(err.response?.data?.message || "Failed to load coding problem.")
        toast.error(err.response?.data?.message || "Failed to load coding problem.")
      } finally {
        setIsLoadingProblem(false)
      }
    }

    if (user || firebaseUser) {
      // Only fetch if either user type is logged in
      fetchProblem()
    }
  }, [user, firebaseUser, isLoadingAuth, router, problemId, language, token])

  const handleRunCode = async () => {
    if (!problem || !code || !token) {
      toast.error("Please connect your MetaMask wallet to run code.")
      return // Ensure token exists for this action
    }
    setIsExecutingCode(true)
    setExecutionResults(null)
    try {
      const response = await api.post<CodeExecutionResult>(
        "/api/coding/run",
        {
          problem_id: problem.id,
          code,
          language,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      setExecutionResults(response.data)
      if (response.data.correct) {
        toast.success("Code ran successfully and passed tests!")
      } else {
        toast.error("Code ran, but failed some tests.")
      }
    } catch (err: any) {
      console.error("Failed to run code:", err)
      toast.error(err.response?.data?.message || "Failed to run code.")
    } finally {
      setIsExecutingCode(false)
    }
  }

  const handleSubmitSolution = async () => {
    if (!problem || !code || !token) {
      toast.error("Please connect your MetaMask wallet to submit solutions.")
      return // Ensure token exists for this action
    }
    setIsSubmittingSolution(true)
    try {
      const response = await api.post<CodeExecutionResult>(
        "/api/coding/submit",
        {
          problem_id: problem.id,
          code,
          language,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      setExecutionResults(response.data)
      if (response.data.correct) {
        toast.success("Solution submitted successfully and passed all tests!")
        setProblem((prev) => (prev ? { ...prev, solved: true } : null)) // Mark as solved
      } else {
        toast.error("Solution submitted, but failed some tests. Keep trying!")
      }
    } catch (err: any) {
      console.error("Failed to submit solution:", err)
      toast.error(err.response?.data?.message || "Failed to submit solution.")
    } finally {
      setIsSubmittingSolution(false)
    }
  }

  if (isLoadingAuth || isLoadingProblem) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-purple" />
        <span className="ml-2 text-lg">Loading problem...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)] text-red-500">
        <p>{error}</p>
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)] text-gray-600 dark:text-gray-300">
        <p className="text-xl">Coding problem not found.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[calc(100vh-64px)]">
      <div className="space-y-6">
        {authMethod === "firebase" && !token && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md dark:bg-yellow-900 dark:border-yellow-600 dark:text-yellow-200">
            <p className="font-bold">Limited Access</p>
            <p>
              You are logged in with email. Full functionality, including code execution and submission, requires
              connecting your MetaMask wallet.
            </p>
          </div>
        )}
        <h1 className="text-3xl font-bold text-primary-purple">{problem.title}</h1>
        <SolutionTabs problemDescription={problem.description} testCases={problem.test_cases} />
      </div>
      <div className="space-y-6">
        <CodeEditor
          code={code}
          onCodeChange={setCode}
          language={language}
          onLanguageChange={setLanguage}
          availableLanguages={availableLanguages}
        />
        <div className="flex gap-4 justify-end">
          <Button
            onClick={handleRunCode}
            disabled={isExecutingCode || isSubmittingSolution || !token} // Disable if no token
            className="bg-primary-purple hover:bg-primary-purple/90 text-white"
          >
            {isExecutingCode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Code
          </Button>
          <Button
            onClick={handleSubmitSolution}
            disabled={isExecutingCode || isSubmittingSolution || problem.solved || !token} // Disable if no token
            className="bg-primary-blue hover:bg-primary-blue/90 text-white"
          >
            {isSubmittingSolution && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {problem.solved ? "Solved!" : "Submit"}
          </Button>
        </div>
        <TestResultsPanel results={executionResults} isLoading={isExecutingCode} />
      </div>
    </div>
  )
}
