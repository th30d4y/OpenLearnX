import { QuizRunner } from "@/components/quiz-runner"

interface QuizPageProps {
  params: {
    quizId: string
  }
}

export default function QuizPage({ params }: QuizPageProps) {
  return <QuizRunner quizId={params.quizId} />
}
