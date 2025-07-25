"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import type { Question, Feedback } from "@/lib/types"
import { QuestionCard } from "./question-card"
import { FeedbackPanel } from "./feedback-panel"
import { ProgressTracker } from "./progress-tracker"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from "lucide-react"
import api from "@/lib/api"
import type { TestStartRequest, TestStartResponse, TestAnswerRequest, TestAnswerResponse } from "@/lib/types"
// import { MOCK_QUESTION, MOCK_FEEDBACK_CORRECT } from "@/lib/mock-data" // Import mock data

type QuizState = "subject_selection" | "in_progress" | "showing_feedback" | "completed"

export function QuizRunner({ quizId }: { quizId?: string }) {
  const { user, firebaseUser, isLoadingAuth, authMethod, token } = useAuth() // Use firebaseUser and authMethod
  const router = useRouter()

  const [quizState, setQuizState] = useState<QuizState>("subject_selection")
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)
  const [isStartingQuiz, setIsStartingQuiz] = useState(false)

  const availableSubjects = ["Math", "Science", "History", "Literature"] // Example subjects

  useEffect(() => {
    if (!isLoadingAuth && !user && !firebaseUser) {
      toast.error("Please login to take a quiz.")
      router.push("/") // Redirect to home if not authenticated
    }
  }, [user, firebaseUser, isLoadingAuth, router])

  const startQuiz = async () => {
    if (!selectedSubject) {
      toast.error("Please select a subject to start the quiz.")
      return
    }
    // --- MOCK DATA IMPLEMENTATION START ---
    // Remove this block and uncomment the API call below when your backend is ready
    // setIsStartingQuiz(true)
    // setTimeout(() => {
    //   setSessionId("mock-session-123")
    //   setCurrentQuestion(MOCK_QUESTION)
    //   setQuestionNumber(1)
    //   setTotalQuestions(5) // Mock total questions
    //   setFeedback(null)
    //   setQuizState("in_progress")
    //   toast.success(`Mock Quiz started for ${selectedSubject}!`)
    //   setIsStartingQuiz(false)
    // }, 1000)
    // --- MOCK DATA IMPLEMENTATION END ---

    /*
    // --- ORIGINAL API CALL (UNCOMMENT WHEN BACKEND IS READY) ---
    */
    if (authMethod === "firebase" && !token) {
      toast.error("Quiz progress and persistence require MetaMask authentication.")
      return // Prevent API call for Firebase users without JWT
    }

    setIsStartingQuiz(true)
    try {
      const response = await api.post<TestStartResponse>("/api/test/start", {
        subject: selectedSubject,
      } as TestStartRequest)
      setSessionId(response.data.session_id)
      setCurrentQuestion(response.data.question)
      setQuestionNumber(response.data.question_number)
      setTotalQuestions(response.data.total_questions)
      setFeedback(null)
      setQuizState("in_progress")
      toast.success(`Quiz started for ${selectedSubject}!`)
    } catch (error: any) {
      console.error("Error starting quiz:", error)
      toast.error(error.response?.data?.message || "Failed to start quiz.")
    } finally {
      setIsStartingQuiz(false)
    }
    // */
  }

  const handleAnswerSubmit = async (questionId: string, answerIndex: number) => {
    if (!sessionId) {
      toast.error("No active quiz session found.")
      return
    }
    // --- MOCK DATA IMPLEMENTATION START ---
    // Remove this block and uncomment the API call below when your backend is ready
    // setIsSubmittingAnswer(true)
    // setTimeout(() => {
    //   const isCorrect = answerIndex === 2 // Mocking 'Paris' as correct answer
    //   setFeedback(
    //     isCorrect
    //       ? MOCK_FEEDBACK_CORRECT
    //       : {
    //           ...MOCK_FEEDBACK_CORRECT,
    //           correct: false,
    //           explanation: "That's not correct. The capital of France is Paris.",
    //           confidence_score: 0.2,
    //           correct_answer: "Paris",
    //         },
    //   )

    //   const nextQNum = questionNumber + 1
    //   if (nextQNum > totalQuestions) {
    //     setCurrentQuestion(null)
    //     setQuizState("completed")
    //     toast.success("Mock Quiz completed!")
    //   } else {
    //     setCurrentQuestion({ ...MOCK_QUESTION, id: `q${nextQNum}`, text: `Mock Question ${nextQNum}` }) // Simulate next question
    //     setQuestionNumber(nextQNum)
    //     setQuizState("showing_feedback")
    //   }
    //   setIsSubmittingAnswer(false)
    // }, 1000)
    // --- MOCK DATA IMPLEMENTATION END ---

    /*
    // --- ORIGINAL API CALL (UNCOMMENT WHEN BACKEND IS READY) ---
    */
    if (authMethod === "firebase" && !token) {
      toast.error("Quiz progress and persistence require MetaMask authentication.")
      return // Prevent API call for Firebase users without JWT
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
      // Only increment if not the last question, or if backend sends next_question as null for last
      if (!response.data.test_completed) {
        setQuestionNumber((prev) => prev + 1)
      }
      if (response.data.test_completed) {
        setQuizState("completed")
        toast.success("Quiz completed!")
      } else {
        setQuizState("showing_feedback")
      }
    } catch (error: any) {
      console.error("Error submitting answer:", error)
      toast.error(error.response?.data?.message || "Failed to submit answer.")
    } finally {
      setIsSubmittingAnswer(false)
    }
    // */
  }

  const handleContinue = () => {
    if (currentQuestion) {
      setQuizState("in_progress")
      setFeedback(null)
    } else {
      setQuizState("completed")
    }
  }

  const handleStartNewQuiz = () => {
    setQuizState("subject_selection")
    setSelectedSubject(null)
    setSessionId(null)
    setCurrentQuestion(null)
    setQuestionNumber(0)
    setTotalQuestions(0)
    setFeedback(null)
  }

  if (isLoadingAuth || (!user && !firebaseUser)) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-purple" />
        <span className="ml-2 text-lg">Loading authentication...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 min-h-[calc(100vh-64px)] flex flex-col items-center justify-center">
      {quizState === "subject_selection" && (
        <Card className="w-full max-w-md bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary-purple">Select a Quiz Subject</CardTitle>
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
              onClick={startQuiz}
              disabled={!selectedSubject || isStartingQuiz}
              className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white"
            >
              {isStartingQuiz && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Quiz
            </Button>
            {authMethod === "firebase" && !token && (
              <p className="text-sm text-center text-warning dark:text-warning/80 mt-4">
                Note: Quiz progress will not be saved without MetaMask authentication.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {(quizState === "in_progress" || quizState === "showing_feedback") && questionNumber <= totalQuestions && (
        <div className="w-full max-w-2xl space-y-6">
          <ProgressTracker currentQuestionNumber={questionNumber} totalQuestions={totalQuestions} />
          {quizState === "in_progress" && currentQuestion && (
            <QuestionCard
              question={currentQuestion}
              onAnswerSubmit={handleAnswerSubmit}
              isLoading={isSubmittingAnswer}
            />
          )}
          {quizState === "showing_feedback" && feedback && (
            <FeedbackPanel
              feedback={feedback}
              nextQuestion={currentQuestion}
              testCompleted={!currentQuestion} // If currentQuestion is null, test is completed
              onContinue={handleContinue}
              onStartNewTest={handleStartNewQuiz}
            />
          )}
        </div>
      )}

      {quizState === "completed" && (
        <Card className="w-full max-w-md bg-white shadow-md rounded-lg p-6 text-center dark:bg-gray-800 dark:text-gray-100">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary-purple">Quiz Completed!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg text-gray-700 dark:text-gray-200">You have successfully completed the quiz.</p>
            <Button onClick={handleStartNewQuiz} className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white">
              Take Another Quiz
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
