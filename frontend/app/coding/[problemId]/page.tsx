'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Play, Clock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'

interface TestCase {
  input: string
  expected: string
  description: string
}

interface Problem {
  id: string
  title: string
  description: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  category: string
  examples: TestCase[]
  constraints: string[]
  hints: string[]
  starter_code: string
  function_name: string
}

export default function ProblemPage() {
  const params = useParams()
  const router = useRouter()
  const problemId = params.problemId as string

  const [problem, setProblem] = useState<Problem | null>(null)
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')
  const [testResults, setTestResults] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'editorial' | 'solutions' | 'submissions'>('description')
  const [detailTab, setDetailTab] = useState<'examples' | 'constraints' | 'hints'>('examples')
  const [bottomTab, setBottomTab] = useState<'testcase' | 'result'>('testcase')
  const [customInput, setCustomInput] = useState('')

  useEffect(() => {
    loadProblem(problemId)
  }, [problemId])

  const loadProblem = async (id: string) => {
    try {
      // In a real app, this would fetch from your backend
      const problems: Record<string, Problem> = {
        'string-capitalizer': {
          id: 'string-capitalizer',
          title: 'String Capitalizer',
          description: 'Write a function that takes a string as input and returns the string converted to uppercase.',
          difficulty: 'Easy',
          category: 'String Manipulation',
          examples: [
            { input: 'hello', expected: 'HELLO', description: 'Basic string conversion' },
            { input: 'world', expected: 'WORLD', description: 'Another basic case' },
            { input: 'Python Programming', expected: 'PYTHON PROGRAMMING', description: 'String with spaces' }
          ],
          constraints: [
            'Input string length will be between 1 and 1000 characters',
            'Input may contain letters, numbers, and spaces',
            'Function must be named exactly "capitalize_string"'
          ],
          hints: [
            'Python has a built-in method to convert strings to uppercase',
            'The upper() method can be used on any string',
            'Remember to return the result, not just print it'
          ],
          starter_code: 'def capitalize_string(text):\n    # Write your solution here\n    pass',
          function_name: 'capitalize_string'
        },
        'reverse-string': {
          id: 'reverse-string',
          title: 'Reverse String',
          description: 'Write a function that takes a string and returns it reversed.',
          difficulty: 'Easy',
          category: 'String Manipulation',
          examples: [
            { input: 'hello', expected: 'olleh', description: 'Basic string reversal' },
            { input: 'python', expected: 'nohtyp', description: 'Another basic case' },
            { input: 'OpenLearnX', expected: 'XnraeLnepO', description: 'Mixed case string' }
          ],
          constraints: [
            'Input string length will be between 1 and 1000 characters',
            'Function must be named exactly "reverse_string"'
          ],
          hints: [
            'Python strings can be sliced with [::-1]',
            'You can also use the reversed() function',
            'Remember to return the result'
          ],
          starter_code: 'def reverse_string(text):\n    # Write your solution here\n    pass',
          function_name: 'reverse_string'
        },
        'fibonacci': {
          id: 'fibonacci',
          title: 'Fibonacci Sequence',
          description: 'Write a function that returns the nth number in the Fibonacci sequence.',
          difficulty: 'Medium',
          category: 'Algorithms',
          examples: [
            { input: '0', expected: '0', description: 'First Fibonacci number' },
            { input: '1', expected: '1', description: 'Second Fibonacci number' },
            { input: '5', expected: '5', description: 'Sixth Fibonacci number (0,1,1,2,3,5)' }
          ],
          constraints: [
            'n will be between 0 and 30',
            'Function must be named exactly "fibonacci"',
            'Should handle edge cases for n=0 and n=1'
          ],
          hints: [
            'Base cases: fib(0) = 0, fib(1) = 1',
            'For n > 1: fib(n) = fib(n-1) + fib(n-2)',
            'Consider using iteration instead of recursion for better performance'
          ],
          starter_code: 'def fibonacci(n):\n    # Write your solution here\n    pass',
          function_name: 'fibonacci'
        }
      }

      const selectedProblem = problems[id]
      if (selectedProblem) {
        setProblem(selectedProblem)
        setCode(selectedProblem.starter_code)
        setCustomInput(selectedProblem.examples[0]?.input || '')
      } else {
        // Problem not found
        router.push('/coding')
      }
    } catch (error) {
      console.error('Failed to load problem:', error)
      router.push('/coding')
    }
  }

  const runCode = async () => {
    if (!problem || !code.trim()) return

    setIsRunning(true)
    setOutput('')
    setTestResults([])

    try {
      const response = await fetch('http://127.0.0.1:5000/api/coding/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: 'python',
          problem_id: problem.id,
          test_cases: problem.examples
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setOutput(result.output || 'Code executed successfully')
        setTestResults(result.test_results || [])
      } else {
        setOutput(`Error: ${result.error}`)
      }
    } catch (error) {
      setOutput(`Execution failed: ${(error as Error).message}`)
    } finally {
      setIsRunning(false)
    }
  }

  const submitSolution = async () => {
    if (!problem || !code.trim()) return

    setIsSubmitting(true)

    try {
      const response = await fetch('http://127.0.0.1:5000/api/coding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          problem_id: problem.id
        })
      })

      const result = await response.json()
      
      if (result.success) {
        alert(`Solution submitted! Score: ${result.score}% (${result.passed_tests}/${result.total_tests} tests passed)`)
      } else {
        alert(`Submission failed: ${result.error}`)
      }
    } catch (error) {
      alert('Failed to submit solution')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-100'
      case 'Medium': return 'text-yellow-600 bg-yellow-100'
      case 'Hard': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (!problem) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading problem...</p>
        </div>
      </div>
    )
  }

  const passedCount = testResults.filter((result) => result.passed).length
  const allPassed = testResults.length > 0 && passedCount === testResults.length

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/coding')}
              className="rounded-md border border-border p-2 text-muted-foreground hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold">{problem.id}. {problem.title}</h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`rounded px-2 py-0.5 font-medium ${getDifficultyColor(problem.difficulty)}`}>
                  {problem.difficulty}
                </span>
                <span>{problem.category}</span>
                {allPassed && <span className="text-emerald-600 dark:text-emerald-400">Solved</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runCode}
              disabled={isRunning || !code.trim()}
              className="rounded-md border border-border bg-secondary px-3 py-2 text-sm text-secondary-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunning ? 'Running...' : 'Run'}
            </button>
            <button
              onClick={submitSolution}
              disabled={isSubmitting || !code.trim()}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      </header>

      <main className="h-[calc(100vh-73px)] p-3">
        <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-2">
          <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex border-b border-border text-sm">
              {(['description', 'editorial', 'solutions', 'submissions'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 capitalize ${
                    activeTab === tab
                      ? 'border-b-2 border-primary text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs">
              <button
                onClick={() => setDetailTab('examples')}
                className={`rounded px-2 py-1 ${detailTab === 'examples' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Examples
              </button>
              <button
                onClick={() => setDetailTab('constraints')}
                className={`rounded px-2 py-1 ${detailTab === 'constraints' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Constraints
              </button>
              <button
                onClick={() => setDetailTab('hints')}
                className={`rounded px-2 py-1 ${detailTab === 'hints' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Hints
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {activeTab === 'description' && (
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p className="leading-7">{problem.description}</p>

                  {detailTab === 'examples' && (
                    <div className="space-y-3">
                      {problem.examples.map((example, index) => (
                        <div key={index} className="rounded-lg border border-border bg-secondary/40 p-3">
                          <p className="font-medium text-foreground">Example {index + 1}</p>
                          <p className="mt-2"><span className="text-muted-foreground">Input:</span> <code className="text-primary">{example.input}</code></p>
                          <p><span className="text-muted-foreground">Output:</span> <code className="text-primary">{example.expected}</code></p>
                          <p className="mt-1 text-xs text-muted-foreground">{example.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {detailTab === 'constraints' && (
                    <ul className="space-y-2 text-muted-foreground">
                      {problem.constraints.map((constraint, index) => (
                        <li key={index} className="rounded border border-border bg-secondary/40 px-3 py-2">
                          {constraint}
                        </li>
                      ))}
                    </ul>
                  )}

                  {detailTab === 'hints' && (
                    <ul className="space-y-2">
                      {problem.hints.map((hint, index) => (
                        <li key={index} className="rounded border border-amber-300 bg-amber-100/70 px-3 py-2 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                          {index + 1}. {hint}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {activeTab === 'editorial' && (
                <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Editorial</p>
                  <p className="mt-2">Approach: Use the Python string method that transforms text to uppercase and return it directly from <code className="text-primary">{problem.function_name}</code>.</p>
                </div>
              )}

              {activeTab === 'solutions' && (
                <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Community Solutions</p>
                  <p className="mt-2">Your submitted solutions will appear here after running Submit.</p>
                </div>
              )}

              {activeTab === 'submissions' && (
                <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Submissions</p>
                  <p className="mt-2">No submissions yet. Run and submit your code to populate this section.</p>
                </div>
              )}
            </div>
          </section>

          <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2 text-sm">
              <span className="text-foreground">Code</span>
              <span className="text-xs text-muted-foreground">Python</span>
            </div>

            <div className="min-h-0 flex-1 border-b border-border">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-full w-full resize-none bg-background p-4 font-mono text-sm text-foreground outline-none"
                spellCheck={false}
              />
            </div>

            <div className="h-[38%] min-h-[220px]">
              <div className="flex border-b border-border text-sm">
                <button
                  onClick={() => setBottomTab('testcase')}
                  className={`px-4 py-2 ${bottomTab === 'testcase' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Testcase
                </button>
                <button
                  onClick={() => setBottomTab('result')}
                  className={`px-4 py-2 ${bottomTab === 'result' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Test Result
                </button>
              </div>

              <div className="h-[calc(100%-41px)] overflow-y-auto p-4">
                {bottomTab === 'testcase' && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-muted-foreground">Custom Input</label>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      className="h-24 w-full rounded border border-border bg-secondary/40 p-3 font-mono text-sm text-foreground outline-none"
                      placeholder="Enter custom testcase input"
                    />
                    <p className="text-xs text-muted-foreground">Function: <code className="text-primary">{problem.function_name}</code></p>
                    <div className="flex gap-2">
                      <button
                        onClick={runCode}
                        disabled={isRunning || !code.trim()}
                        className="inline-flex items-center gap-2 rounded bg-secondary px-3 py-2 text-sm text-secondary-foreground hover:bg-accent disabled:opacity-60"
                      >
                        <Play className="h-4 w-4" />
                        {isRunning ? 'Running...' : 'Run'}
                      </button>
                      <button
                        onClick={submitSolution}
                        disabled={isSubmitting || !code.trim()}
                        className="inline-flex items-center gap-2 rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {isSubmitting ? 'Submitting...' : 'Submit'}
                      </button>
                    </div>
                  </div>
                )}

                {bottomTab === 'result' && (
                  <div className="space-y-3">
                    {output && (
                      <div className="rounded border border-border bg-secondary/40 p-3">
                        <p className="mb-2 text-xs text-muted-foreground">Console</p>
                        <pre className="whitespace-pre-wrap text-sm text-foreground">{output}</pre>
                      </div>
                    )}

                    {testResults.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Passed {passedCount}/{testResults.length} tests</p>
                        {testResults.map((result, index) => (
                          <div
                            key={index}
                            className={`flex items-center justify-between rounded border px-3 py-2 text-sm ${
                              result.passed
                                ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'border-red-300 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {result.passed ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                              Test {index + 1}
                            </span>
                            <span>{result.passed ? 'Passed' : `Failed${result.error ? `: ${result.error}` : ''}`}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {!output && testResults.length === 0 && (
                      <div className="py-8 text-center text-muted-foreground">
                        <Clock className="mx-auto mb-2 h-8 w-8 opacity-60" />
                        Run your code to see results.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
