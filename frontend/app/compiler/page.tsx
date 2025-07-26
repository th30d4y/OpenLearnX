'use client'
import React, { useState, useEffect } from 'react'
import { Play, Square, Download, Upload, Settings, Clock, MemoryStick, Cpu } from 'lucide-react'

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

export default function RealCompilerInterface() {
  const [code, setCode] = useState('')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('python')
  const [languages, setLanguages] = useState<Language[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [executionHistory, setExecutionHistory] = useState<ExecutionResult[]>([])

  const languageTemplates: { [key: string]: string } = {
    python: `# Python Code
print("Hello World!")
name = input("Enter your name: ")
print(f"Hello, {name}!")`,
    
    java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World!");
        // Your code here
    }
}`,
    
    cpp: `#include <iostream>
#include <string>
using namespace std;

int main() {
    cout << "Hello World!" << endl;
    string name;
    cout << "Enter your name: ";
    getline(cin, name);
    cout << "Hello, " << name << "!" << endl;
    return 0;
}`,
    
    c: `#include <stdio.h>
int main() {
    printf("Hello World!\\n");
    char name[100];
    printf("Enter your name: ");
    fgets(name, sizeof(name), stdin);
    printf("Hello, %s", name);
    return 0;
}`,
    
    javascript: `// JavaScript Code
console.log("Hello World!");
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter your name: ', (name) => {
    console.log(\`Hello, \${name}!\`);
    rl.close();
});`,
    
    go: `package main

import (
    "fmt"
    "bufio"
    "os"
)

func main() {
    fmt.Println("Hello World!")
    reader := bufio.NewReader(os.Stdin)
    fmt.Print("Enter your name: ")
    name, _ := reader.ReadString('\\n')
    fmt.Printf("Hello, %s", name)
}`,
    
    rust: `use std::io;

fn main() {
    println!("Hello World!");
    println!("Enter your name: ");
    let mut name = String::new();
    io::stdin().read_line(&mut name).expect("Failed to read line");
    println!("Hello, {}!", name.trim());
}`
  }

  useEffect(() => {
    fetchSupportedLanguages()
  }, [])

  useEffect(() => {
    if (selectedLanguage && languageTemplates[selectedLanguage] && !code) {
      setCode(languageTemplates[selectedLanguage])
    }
  }, [selectedLanguage])

  const fetchSupportedLanguages = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/compiler/languages')
      const data = await response.json()
      if (data.success) {
        setLanguages(data.languages)
      }
    } catch (error) {
      console.error('Failed to fetch languages:', error)
    }
  }

  const executeCode = async () => {
    if (!code.trim()) {
      alert('Please write some code first!')
      return
    }

    setIsExecuting(true)
    setOutput('')
    setExecutionResult(null)

    try {
      const response = await fetch('http://127.0.0.1:5000/api/compiler/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: selectedLanguage,
          input: input
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setOutput(result.output || result.error || 'No output')
        setExecutionResult(result)
        
        // Add to history
        setExecutionHistory(prev => [result, ...prev.slice(0, 9)]) // Keep last 10
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
        body: JSON.stringify({ language: selectedLanguage })
      })

      const result = await response.json()
      
      if (result.success) {
        setOutput(result.output)
        alert('Compiler test successful!')
      } else {
        setOutput(`Test failed: ${result.error}`)
      }
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
      reader.onload = (e) => {
        const content = e.target?.result as string
        setCode(content)
      }
      reader.readAsText(file)
    }
  }

  const clearAll = () => {
    setCode('')
    setInput('')
    setOutput('')
    setExecutionResult(null)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">OpenLearnX Real Compiler</h1>
              <p className="text-gray-400">Execute code in multiple programming languages with real output</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={testCompiler}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>Test Compiler</span>
              </button>
              
              <div className="text-sm text-gray-400">
                {languages.length} languages supported
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Code Editor */}
          <div className="space-y-4">
            {/* Language Selector & Controls */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Code Editor</h2>
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600"
                  >
                    {languages.map(lang => (
                      <option key={lang.id} value={lang.id}>
                        {lang.name} ({lang.extension})
                      </option>
                    ))}
                  </select>
                  
                  <input
                    type="file"
                    accept=".py,.java,.cpp,.c,.js,.go,.rs,.sh"
                    onChange={loadCodeFile}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                  </label>
                  
                  <button
                    onClick={downloadCode}
                    className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Write your code here..."
                className="w-full h-80 bg-gray-900 text-green-400 font-mono p-4 rounded border border-gray-600 resize-none focus:ring-2 focus:ring-blue-500"
                spellCheck={false}
              />
              
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-400">
                  Language: {languages.find(l => l.id === selectedLanguage)?.name}
                  {executionResult && (
                    <span className="ml-4">
                      Last execution: {executionResult.execution_time}s
                    </span>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={clearAll}
                    className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-sm"
                  >
                    Clear All
                  </button>
                  
                  <button
                    onClick={executeCode}
                    disabled={isExecuting}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-2 rounded flex items-center space-x-2"
                  >
                    <Play className="h-4 w-4" />
                    <span>{isExecuting ? 'Executing...' : 'Run Code'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Input Section */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-bold mb-2">Input Data</h3>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter input data for your program (if needed)..."
                className="w-full h-24 bg-gray-900 text-white font-mono p-3 rounded border border-gray-600 resize-none"
              />
            </div>
          </div>

          {/* Output & Results */}
          <div className="space-y-4">
            {/* Output */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Output</h3>
                {executionResult && (
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{executionResult.execution_time}s</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MemoryStick className="h-4 w-4" />
                      <span>{Math.round(executionResult.memory_used / 1024)}KB</span>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      executionResult.exit_code === 0 ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                    }`}>
                      Exit: {executionResult.exit_code}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-black p-4 rounded h-80 overflow-y-auto">
                <pre className="text-green-400 font-mono whitespace-pre-wrap text-sm">
                  {output || 'No output yet. Run your code to see results here.'}
                </pre>
              </div>
            </div>

            {/* Execution History */}
            {executionHistory.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold mb-4">Execution History</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {executionHistory.map((result, index) => (
                    <div
                      key={result.execution_id}
                      className="flex items-center justify-between p-2 bg-gray-700 rounded text-sm cursor-pointer hover:bg-gray-600"
                      onClick={() => {
                        setOutput(result.output || result.error)
                        setExecutionResult(result)
                      }}
                    >
                      <div>
                        <span className="font-medium">{result.language}</span>
                        <span className="text-gray-400 ml-2">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span>{result.execution_time}s</span>
                        <div className={`w-2 h-2 rounded-full ${
                          result.exit_code === 0 ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                      </div>
                    </div>
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
