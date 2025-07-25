import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Zap, LinkIcon, BookOpen, Code, Lightbulb } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      <section className="relative w-full py-12 md:py-24 lg:py-32 bg-gradient-to-r from-primary-blue to-primary-purple text-white">
        <div className="container px-4 md:px-6 text-center">
          <div className="max-w-3xl mx-auto space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
              OpenLearnX – Decentralized Adaptive Learning
            </h1>
            <p className="text-lg md:text-xl">
              Unlock your potential with AI-powered adaptive learning, coding practice, and blockchain-secured
              credentials.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row justify-center">
              <Link href="/courses">
                <Button className="bg-white text-primary-purple hover:bg-gray-100 px-8 py-3 text-lg font-semibold rounded-full shadow-lg">
                  Start Learning
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-900">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100">
              <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                <BookOpen className="h-8 w-8 text-primary-blue" />
                <CardTitle className="text-xl font-semibold">Interactive Courses</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600 dark:text-gray-300">
                Engage with rich multimedia content, track your progress, and master new subjects at your own pace.
              </CardContent>
            </Card>
            <Card className="bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100">
              <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                <Code className="h-8 w-8 text-primary-purple" />
                <CardTitle className="text-xl font-semibold">LeetCode-Style Coding Practice</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600 dark:text-gray-300">
                Sharpen your coding skills with interactive problems, instant feedback, and a built-in code editor.
              </CardContent>
            </Card>
            <Card className="bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100">
              <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                <Lightbulb className="h-8 w-8 text-primary-blue" />
                <CardTitle className="text-xl font-semibold">Advanced Quiz Platform</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600 dark:text-gray-300">
                Test your knowledge with timed multiple-choice quizzes, detailed explanations, and performance tracking.
              </CardContent>
            </Card>
            <Card className="bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100">
              <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                <Brain className="h-8 w-8 text-primary-purple" />
                <CardTitle className="text-xl font-semibold">AI-powered Adaptive Learning</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600 dark:text-gray-300">
                Our platform intelligently adjusts content and question difficulty based on your performance.
              </CardContent>
            </Card>
            <Card className="bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100">
              <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                <LinkIcon className="h-8 w-8 text-primary-blue" />
                <CardTitle className="text-xl font-semibold">Blockchain-secured Credentials</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600 dark:text-gray-300">
                Your achievements are secured on the blockchain, providing verifiable and tamper-proof records.
              </CardContent>
            </Card>
            <Card className="bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100">
              <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                <Zap className="h-8 w-8 text-primary-purple" />
                <CardTitle className="text-xl font-semibold">Personalized Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600 dark:text-gray-300">
                Track your progress, identify strengths and weaknesses, and visualize your learning journey.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
