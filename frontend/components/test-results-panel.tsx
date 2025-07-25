import type { CodeExecutionResult } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock } from "lucide-react"

interface TestResultsPanelProps {
  results: CodeExecutionResult | null
  isLoading: boolean
}

export function TestResultsPanel({ results, isLoading }: TestResultsPanelProps) {
  if (isLoading) {
    return (
      <Card className="bg-white shadow-md rounded-lg p-4 dark:bg-gray-800 dark:text-gray-100">
        <CardContent className="flex items-center justify-center h-24">
          <p className="text-gray-500 dark:text-gray-400">Running tests...</p>
        </CardContent>
      </Card>
    )
  }

  if (!results) {
    return null
  }

  return (
    <Card className="bg-white shadow-md rounded-lg p-4 dark:bg-gray-800 dark:text-gray-100">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-semibold">Test Results</CardTitle>
        {results.correct ? (
          <Badge className="bg-success text-white flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" /> Correct
          </Badge>
        ) : (
          <Badge className="bg-destructive text-white flex items-center gap-1">
            <XCircle className="h-4 w-4" /> Incorrect
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
          <Clock className="h-4 w-4" />
          <span>Runtime: {results.runtime.toFixed(2)} ms</span>
        </div>
        {results.output && (
          <div>
            <h3 className="font-semibold mb-1">Output:</h3>
            <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md overflow-x-auto text-gray-800 dark:text-gray-200">
              <code>{results.output}</code>
            </pre>
          </div>
        )}
        {results.error && (
          <div>
            <h3 className="font-semibold mb-1 text-destructive">Error:</h3>
            <pre className="bg-red-50 dark:bg-red-950 p-3 rounded-md overflow-x-auto text-destructive dark:text-red-200">
              <code>{results.error}</code>
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
