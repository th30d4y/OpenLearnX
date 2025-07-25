"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import api from "@/lib/api"
import type {
  Question,
  Feedback,
  TestStartRequest,
  TestStartResponse,
  TestAnswerRequest,
  TestAnswerResponse,
} from "@/lib/types"
import { QuestionCard } from "./question-card"
import { FeedbackPanel } from "./feedback-panel"
import { ProgressTracker } from "./progress-tracker"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from "lucide-react"

type TestState = "subject_selection" | "in_progress" | "showing_feedback" | "completed"

export function TestingSession() {
  const { user, isLoadingAuth } = useAuth()
  const router = useRouter()

  const [testState, setTestState] = useState<TestState>("subject_selection")
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)
  const [isStartingTest, setIsStartingTest] = useState(false)

  const availableSubjects = ["Math", "Science", "History", "Literature"] // Example subjects

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      toast.error("Please connect your wallet to take a test.")
      router.push("/") // Redirect to home if not authenticated
    }
  }, [user, isLoadingAuth, router])

  const startTest = async () => {
    if (!selectedSubject) {
      toast.error("Please select a subject to start the test.")
      return
    }
    setIsStartingTest(true)
    try {
      const response = await api.post<TestStartResponse>("/api/test/start", {
        subject: selectedSubject,
      } as TestStartRequest)
      setSessionId(response.data.session_id)
      setCurrentQuestion(response.data.question)
      setQuestionNumber(response.data.question_number)
      setTotalQuestions(response.data.total_questions)
      setFeedback(null)
      setTestState("in_progress")
      toast.success(`Test started for ${selectedSubject}!`)
    } catch (error: any) {
      console.error("Error starting test:", error)
      toast.error(error.response?.data?.message || "Failed to start test.")
    } finally {
      setIsStartingTest(false)
    }
  }

  const handleAnswerSubmit = async (questionId: string, answerIndex: number) => {
    if (!sessionId) {
      toast.error("No active test session found.")
      return
    }
    setIsSubmittingAnswer(true)
    try {
      const response = await api.post<TestAnswerResponse>("/api/test/answer", {
        session_id: sessionId,
        question_id: questionId,
        answer: answerIndex,
      } as TestAnswerRequest)
      setFeedback(response.data.feedback)
      setCurrentQuestion(response.data.next_question)
      setQuestionNumber((prev) => prev + 1) // Increment question number for display
      if (response.data.test_completed) {
        setTestState("completed")
        toast.success("Test completed!")
      } else {
        setTestState("showing_feedback")
      }
    } catch (error: any) {
      console.error("Error submitting answer:", error)
      toast.error(error.response?.data?.message || "Failed to submit answer.")
    } finally {
      setIsSubmittingAnswer(false)
    }
  }

  const handleContinue = () => {
    if (currentQuestion) {
      setTestState("in_progress")
      setFeedback(null)
    } else {
      // This case should ideally not happen if test_completed is true
      setTestState("completed")
    }
  }

  const handleStartNewTest = () => {
    setTestState("subject_selection")
    setSelectedSubject(null)
    setSessionId(null)
    setCurrentQuestion(null)
    setQuestionNumber(0)
    setTotalQuestions(0)
    setFeedback(null)
  }

  if (isLoadingAuth || !user) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-purple" />
        <span className="ml-2 text-lg">Loading authentication...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 min-h-[calc(100vh-64px)] flex flex-col items-center justify-center">
      {testState === "subject_selection" && (
        <Card className="w-full max-w-md bg-white shadow-md rounded-lg p-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary-purple">Select a Subject</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup onValueChange={setSelectedSubject} value={selectedSubject || ""} className="space-y-3">
              {availableSubjects.map((subject) => (
                <div key={subject} className="flex items-center space-x-3">
                  <RadioGroupItem value={subject} id={`subject-${subject}`} />
                  <Label
                    htmlFor={`subject-${subject}`}
                    className="text-base text-gray-700 dark:text-gray-200 cursor-pointer"
                  >
                    {subject}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <Button
              onClick={startTest}
              disabled={!selectedSubject || isStartingTest}
              className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white"
            >
              {isStartingTest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Test
            </Button>
          </CardContent>
        </Card>
      )}

      {(testState === "in_progress" || testState === "showing_feedback") && currentQuestion && (
        <div className="w-full max-w-2xl space-y-6">
          <ProgressTracker currentQuestionNumber={questionNumber} totalQuestions={totalQuestions} />
          {testState === "in_progress" && (
            <QuestionCard
              question={currentQuestion}
              onAnswerSubmit={handleAnswerSubmit}
              isLoading={isSubmittingAnswer}
            />
          )}
          {testState === "showing_feedback" && feedback && (
            <FeedbackPanel
              feedback={feedback}
              nextQuestion={currentQuestion}
              testCompleted={!currentQuestion} // If currentQuestion is null, test is completed
              onContinue={handleContinue}
              onStartNewTest={handleStartNewTest}
            />
          )}
        </div>
      )}

      {testState === "completed" && (
        <Card className="w-full max-w-md bg-white shadow-md rounded-lg p-6 text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary-purple">Test Completed!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg text-gray-700 dark:text-gray-200">You have successfully completed the test.</p>
            <Button onClick={handleStartNewTest} className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white">
              Take Another Test
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
