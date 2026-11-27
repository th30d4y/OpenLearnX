'use client'
import React, { useState, useEffect } from 'react'
import { Play, Download, Upload, Settings, Clock, MemoryStick, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface ExecutionResult {
  success: boolean
  execution_id: string
  output: string
  error: string
  execution_time: number
  memory_used: number
  exit_code: number
  language: string
  timestamp: string
}

interface Language {
  id: string
  name: string
  extension: string
  timeout: number
  memory_limit: string
}

const languageTemplates: Record<string, string> = {
  python: `# Python Code\nprint("Hello World!")\nname = input("Enter your name: ")\nprint(f"Hello, {name}!")`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n    }\n}`,
  cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello World!" << endl;\n    return 0;\n}`,
  c: `#include <stdio.h>\nint main() {\n    printf("Hello World!\\n");\n    return 0;\n}`,
  javascript: `// JavaScript Code\nconsole.log("Hello World!");`,
  go: `package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello World!")\n}`,
  rust: `fn main() {\n    println!("Hello World!");\n}`,
}

export default function RealCompilerInterface() {
  const [code, setCode] = useState('')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('python')
  const [languages, setLanguages] = useState<Language[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [executionHistory, setExecutionHistory] = useState<ExecutionResult[]>([])

  useEffect(() => { fetchSupportedLanguages() }, [])

  useEffect(() => {
    if (selectedLanguage && languageTemplates[selectedLanguage] && !code) {
      setCode(languageTemplates[selectedLanguage])
    }
  }, [selectedLanguage])

  const fetchSupportedLanguages = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/compiler/languages')
      const data = await response.json()
      if (data.success) setLanguages(data.languages)
    } catch (error) {
      console.error('Failed to fetch languages:', error)
    }
  }

  const executeCode = async () => {
    if (!code.trim()) { alert('Please write some code first!'); return }
    setIsExecuting(true)
    setOutput('')
    setExecutionResult(null)
    try {
      const response = await fetch('http://127.0.0.1:5000/api/compiler/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: selectedLanguage, input }),
      })
      const result = await response.json()
      if (result.success) {
        setOutput(result.output || result.error || 'No output')
        setExecutionResult(result)
        setExecutionHistory(prev => [result, ...prev.slice(0, 9)])
      } else {
        setOutput(`Error: ${result.error}`)
      }
    } catch (error) {
      setOutput(`Execution failed: ${(error as Error).message}`)
    } finally {
      setIsExecuting(false)
    }
  }

  const testCompiler = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/compiler/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLanguage }),
      })
      const result = await response.json()
      if (result.success) { setOutput(result.output); alert('Compiler test successful!') }
      else setOutput(`Test failed: ${result.error}`)
    } catch (error) {
      setOutput(`Test failed: ${(error as Error).message}`)
    }
  }

  const downloadCode = () => {
    const language = languages.find(l => l.id === selectedLanguage)
    const extension = language?.extension || '.txt'
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const loadCodeFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = e => setCode(e.target?.result as string)
      reader.readAsText(file)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-card-foreground">Compiler</h1>
            <p className="text-sm text-muted-foreground">Execute code in multiple languages</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{languages.length} languages</span>
            <Button variant="outline" size="sm" onClick={testCompiler} className="gap-2">
              <Settings className="h-3.5 w-3.5" />
              Test Compiler
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Code Editor */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold text-card-foreground">Code Editor</Label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedLanguage}
                    onChange={e => setSelectedLanguage(e.target.value)}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {languages.map(lang => (
                      <option key={lang.id} value={lang.id}>{lang.name} ({lang.extension})</option>
                    ))}
                  </select>
                  <input
                    type="file"
                    accept=".py,.java,.cpp,.c,.js,.go,.rs,.sh"
                    onChange={loadCodeFile}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Button variant="outline" size="icon" asChild>
                      <span><Upload className="h-3.5 w-3.5" /></span>
                    </Button>
                  </label>
                  <Button variant="outline" size="icon" onClick={downloadCode}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Write your code here…"
                spellCheck={false}
                rows={18}
                className="w-full rounded-lg border border-border bg-zinc-950 dark:bg-zinc-950 text-emerald-400 font-mono text-sm p-4 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {languages.find(l => l.id === selectedLanguage)?.name}
                  {executionResult && <span className="ml-3">Last run: {executionResult.execution_time}s</span>}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setCode(''); setInput(''); setOutput(''); setExecutionResult(null) }}>
                    Clear
                  </Button>
                  <Button onClick={executeCode} disabled={isExecuting} className="gap-2">
                    {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {isExecuting ? 'Executing…' : 'Run Code'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <Label className="font-semibold text-card-foreground">Standard Input</Label>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Enter input data for your program (if needed)…"
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Output */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold text-card-foreground">Output</Label>
                {executionResult && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{executionResult.execution_time}s</span>
                    <span className="flex items-center gap-1"><MemoryStick className="h-3.5 w-3.5" />{Math.round(executionResult.memory_used / 1024)}KB</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      executionResult.exit_code === 0
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                    }`}>Exit {executionResult.exit_code}</span>
                  </div>
                )}
              </div>
              <div className="rounded-lg bg-zinc-950 p-4 min-h-[22rem] overflow-y-auto">
                <pre className="text-emerald-400 font-mono text-sm whitespace-pre-wrap">
                  {output || 'No output yet. Run your code to see results here.'}
                </pre>
              </div>
            </div>

            {executionHistory.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <Label className="font-semibold text-card-foreground">Execution History</Label>
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {executionHistory.map(result => (
                    <button
                      key={result.execution_id}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 text-sm text-left"
                      onClick={() => { setOutput(result.output || result.error); setExecutionResult(result) }}
                    >
                      <div>
                        <span className="font-medium text-foreground capitalize">{result.language}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{new Date(result.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">{result.execution_time}s</span>
                        <span className={`w-2 h-2 rounded-full ${result.exit_code === 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
