import { CodingProblemView } from "@/components/coding-problem-view"

interface CodingProblemPageProps {
  params: {
    problemId: string
  }
}

export default function CodingProblemPage({ params }: CodingProblemPageProps) {
  return <CodingProblemView problemId={params.problemId} />
}
