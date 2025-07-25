"use client"

import { useState } from "react"
import type { Question, QuestionOption } from "@/lib/types"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface QuestionCardProps {
  question: Question
  onAnswerSubmit: (questionId: string, answerIndex: number) => void
  isLoading: boolean
}

export function QuestionCard({ question, onAnswerSubmit, isLoading }: QuestionCardProps) {
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null)

  const handleSubmit = () => {
    if (selectedOptionIndex !== null) {
      onAnswerSubmit(question.id, selectedOptionIndex)
      setSelectedOptionIndex(null) // Reset selection after submission
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white shadow-md rounded-lg p-6 dark:bg-gray-800 dark:text-gray-100">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">Question {question.id}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-lg text-gray-700 dark:text-gray-200">{question.text}</p>
        <RadioGroup
          onValueChange={(value) => setSelectedOptionIndex(Number.parseInt(value))}
          value={selectedOptionIndex !== null ? String(selectedOptionIndex) : ""}
          className="space-y-3"
        >
          {question.options.map((option: QuestionOption, index: number) => (
            <div key={option.id} className="flex items-center space-x-3">
              <RadioGroupItem value={String(index)} id={`option-${option.id}`} disabled={isLoading} />
              <Label
                htmlFor={`option-${option.id}`}
                className="text-base text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                {option.text}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={selectedOptionIndex === null || isLoading}
          className="bg-primary-purple hover:bg-primary-purple/90 text-white"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Answer
        </Button>
      </CardFooter>
    </Card>
  )
}
