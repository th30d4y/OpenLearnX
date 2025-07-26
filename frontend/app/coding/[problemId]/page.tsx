'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Play, Clock, CheckCircle, XCircle, ArrowLeft, Trophy } from 'lucide-react'

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
  const [showHints, setShowHints] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'examples' | 'constraints'>('description')

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
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading problem...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            
            <div>
              <h1 className="text-2xl font-bold">{problem.title}</h1>
              <div className="flex items-center space-x-3 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(problem.difficulty)}`}>
                  {problem.difficulty}
                </span>
                <span className="text-gray-400 text-sm">{problem.category}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowHints(!showHints)}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm transition-colors"
            >
              {showHints ? 'Hide Hints' : 'Show Hints'}
            </button>
            
            <button
              onClick={() => router.push('/coding/exam')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors flex items-center space-x-2"
            >
              <Trophy className="h-4 w-4" />
              <span>Join Exam</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Problem Description */}
        <div className="space-y-6">
          {/* Navigation Tabs */}
          <div className="bg-gray-800 rounded-lg">
            <div className="flex border-b border-gray-700">
              {(['description', 'examples', 'constraints'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'description' && (
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 leading-relaxed">{problem.description}</p>
                </div>
              )}

              {activeTab === 'examples' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Examples:</h3>
                  {problem.examples.map((example, index) => (
                    <div key={index} className="bg-gray-900 p-4 rounded-lg">
                      <div className="mb-2">
                        <span className="text-blue-400">Input:</span> 
                        <code className="ml-2 text-green-400">"{example.input}"</code>
                      </div>
                      <div className="mb-2">
                        <span className="text-blue-400">Output:</span> 
                        <code className="ml-2 text-green-400">"{example.expected}"</code>
                      </div>
                      <div className="text-gray-400 text-sm">{example.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'constraints' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Constraints:</h3>
                  <ul className="space-y-2">
                    {problem.constraints.map((constraint, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span className="text-gray-300">{constraint}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Hints Section */}
          {showHints && (
            <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-yellow-300">💡 Hints:</h3>
              <ul className="space-y-2">
                {problem.hints.map((hint, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-yellow-400 mt-1">{index + 1}.</span>
                    <span className="text-yellow-100">{hint}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Code Editor & Results */}
        <div className="space-y-6">
          {/* Code Editor */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Code Editor</h3>
              <span className="text-sm text-gray-400">Python</span>
            </div>
            
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-80 bg-gray-900 text-green-400 font-mono p-4 rounded border border-gray-600 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              spellCheck={false}
            />
            
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-400">
                Function: <code className="text-blue-400">{problem.function_name}</code>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={runCode}
                  disabled={isRunning || !code.trim()}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded flex items-center space-x-2 transition-colors"
                >
                  <Play className="h-4 w-4" />
                  <span>{isRunning ? 'Running...' : 'Run Code'}</span>
                </button>
                
                <button
                  onClick={submitSolution}
                  disabled={isSubmitting || !code.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded flex items-center space-x-2 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Output & Test Results */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Output & Test Results</h3>
            
            {/* Console Output */}
            {output && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Console Output:</h4>
                <div className="bg-black p-4 rounded font-mono text-sm">
                  <pre className="text-green-400 whitespace-pre-wrap">{output}</pre>
                </div>
              </div>
            )}

            {/* Test Results */}
            {testResults.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Test Results:</h4>
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded flex items-center justify-between ${
                        result.passed ? 'bg-green-900 border border-green-600' : 'bg-red-900 border border-red-600'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {result.passed ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                        <span className="text-sm">Test {index + 1}</span>
                      </div>
                      
                      <div className="text-right text-sm">
                        {result.passed ? (
                          <span className="text-green-400">Passed</span>
                        ) : (
                          <span className="text-red-400">Failed: {result.error}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!output && testResults.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Run your code to see output and test results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
