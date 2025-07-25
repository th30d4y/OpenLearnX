"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import ReactMarkdown from "react-markdown"

interface SolutionTabsProps {
  problemDescription: string
  testCases: { input: string; expected_output: string }[]
}

export function SolutionTabs({ problemDescription, testCases }: SolutionTabsProps) {
  return (
    <Tabs defaultValue="description" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="description">Description</TabsTrigger>
        <TabsTrigger value="test-cases">Test Cases</TabsTrigger>
      </TabsList>
      <TabsContent value="description">
        <Card className="dark:bg-gray-800 dark:text-gray-100">
          <CardContent className="p-6 prose dark:prose-invert max-w-none">
            <ReactMarkdown>{problemDescription}</ReactMarkdown>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="test-cases">
        <Card className="dark:bg-gray-800 dark:text-gray-100">
          <CardContent className="p-6 space-y-4">
            {testCases.map((tc, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <h4 className="font-semibold text-gray-800 dark:text-gray-100">Test Case {index + 1}</h4>
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  <span className="font-medium">Input:</span>{" "}
                  <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">{tc.input}</code>
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  <span className="font-medium">Expected Output:</span>{" "}
                  <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">{tc.expected_output}</code>
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
