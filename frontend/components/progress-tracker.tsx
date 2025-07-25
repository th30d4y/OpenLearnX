import { Progress } from "@/components/ui/progress"

interface ProgressTrackerProps {
  currentQuestionNumber: number
  totalQuestions: number
}

export function ProgressTracker({ currentQuestionNumber, totalQuestions }: ProgressTrackerProps) {
  const progressValue = (currentQuestionNumber / totalQuestions) * 100

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
        <span>
          Question {currentQuestionNumber} of {totalQuestions}
        </span>
        <span>{Math.round(progressValue)}%</span>
      </div>
      <Progress value={progressValue} className="h-2 bg-primary-blue" />
    </div>
  )
}
