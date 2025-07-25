"use client"

import type { Feedback, Question } from "@/lib/types"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle } from "lucide-react"

interface FeedbackPanelProps {
  feedback: Feedback
  nextQuestion: Question | null
  testCompleted: boolean
  onContinue: () => void
  onStartNewTest: () => void
}

export function FeedbackPanel({
  feedback,
  nextQuestion,
  testCompleted,
  onContinue,
  onStartNewTest,
}: FeedbackPanelProps) {
  return (
    <Card className="w-full max-w-2xl mx-auto bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">Feedback</CardTitle>
        {feedback.correct ? (
          <Badge className="bg-success text-white flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" /> Correct
          </Badge>
        ) : (
          <Badge className="bg-destructive text-white flex items-center gap-1">
            <XCircle className="h-4 w-4" /> Incorrect
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Confidence Score: {Math.round(feedback.confidence_score * 100)}%
          </p>
          <Progress
            value={feedback.confidence_score * 100}
            className="h-2"
            indicatorClassName={
              feedback.confidence_score > 0.7
                ? "bg-success"
                : feedback.confidence_score > 0.4
                  ? "bg-warning"
                  : "bg-destructive"
            }
          />
        </div>
        {feedback.correct_answer && (
          <div className="text-sm text-gray-700 dark:text-gray-200">
            <span className="font-semibold">Correct Answer:</span> {feedback.correct_answer}
          </div>
        )}
        <div className="text-sm text-gray-700 dark:text-gray-200">
          <span className="font-semibold">Explanation:</span> {feedback.explanation}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        {testCompleted ? (
          <Button onClick={onStartNewTest} className="bg-primary-blue hover:bg-primary-blue/90 text-white">
            Start New Test
          </Button>
        ) : (
          <Button onClick={onContinue} className="bg-primary-purple hover:bg-primary-purple/90 text-white">
            Next Question
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
