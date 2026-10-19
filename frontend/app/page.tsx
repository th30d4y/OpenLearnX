import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Brain,
  Code2,
  Trophy,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Zap,
  Shield,
} from "lucide-react"

const STATS = [
  { value: "50+", label: "Courses" },
  { value: "200+", label: "Coding problems" },
  { value: "15+", label: "Languages" },
  { value: "On-chain", label: "Certificates" },
]

const FEATURES = [
  {
    icon: Brain,
    title: "Adaptive AI curriculum",
    description:
      "Every question you answer recalibrates your path. The system identifies gaps in real time and adjusts difficulty so you're always working at the edge of your knowledge.",
  },
  {
    icon: Code2,
    title: "Live competitive exams",
    description:
      "Join or host proctored coding sessions across 15+ languages. Real-time leaderboards, integrity monitoring, and instant execution feedback — built for professional assessment.",
  },
  {
    icon: Trophy,
    title: "Blockchain-verified credentials",
    description:
      "Every certificate is minted as a smart contract on-chain. Tamper-proof, publicly verifiable, and permanently linked to the skills you actually demonstrated.",
  },
]

const QUIZ_PREVIEW = {
  question: "What is the average time complexity of a hash table lookup?",
  number: 7,
  total: 15,
  difficulty: "Medium",
  options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
  correctIndex: 0,
}

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="border-b border-border py-16 md:py-24 lg:py-28">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-[1fr_420px] lg:items-center">
            {/* Left: headline + pitch + CTAs */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-[1.08] text-balance">
                  Courses that adapt.{" "}
                  <br className="hidden sm:block" />
                  Exams that test.{" "}
                  <br className="hidden sm:block" />
                  Credentials that last.
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-lg text-balance">
                  OpenLearnX pairs an AI-adaptive curriculum with live proctored coding exams and
                  blockchain certificates — so your skills are proven, not just claimed.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/auth/signup">
                    Start learning free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/courses">Browse courses</Link>
                </Button>
              </div>
            </div>

            {/* Right: adaptive quiz preview */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              {/* Header bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-border" />
                    <span className="h-2.5 w-2.5 rounded-full bg-border" />
                    <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-1">Adaptive Quiz</span>
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {QUIZ_PREVIEW.number} / {QUIZ_PREVIEW.total}
                </span>
              </div>

              <div className="p-5 space-y-4">
                {/* Difficulty + progress */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {QUIZ_PREVIEW.difficulty}
                  </span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: QUIZ_PREVIEW.total }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1 w-4 rounded-full ${
                          i < QUIZ_PREVIEW.number ? "bg-primary" : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Question */}
                <p className="text-sm font-medium text-card-foreground leading-snug">
                  {QUIZ_PREVIEW.question}
                </p>

                {/* Options */}
                <div className="space-y-2">
                  {QUIZ_PREVIEW.options.map((opt, i) => (
                    <div
                      key={opt}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                        i === QUIZ_PREVIEW.correctIndex
                          ? "border-primary bg-primary/8 text-foreground"
                          : "border-border bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          i === QUIZ_PREVIEW.correctIndex
                            ? "border-primary bg-primary"
                            : "border-border"
                        }`}
                      >
                        {i === QUIZ_PREVIEW.correctIndex && (
                          <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                        )}
                      </span>
                      {opt}
                    </div>
                  ))}
                </div>

                {/* Adaptive note */}
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    Difficulty adapting based on your last 3 answers
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-b border-border bg-muted/30 py-8">
        <div className="container">
          <dl className="grid grid-cols-2 gap-y-6 gap-x-4 md:grid-cols-4">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <dt className="text-xl font-bold text-foreground tabular-nums">{value}</dt>
                <dd className="mt-0.5 text-xs text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
              Three things that make it different
            </h2>
            <p className="mt-3 text-muted-foreground max-w-lg leading-relaxed">
              Most platforms give you video lectures and multiple-choice tests. OpenLearnX gives you
              a system that adapts, tests under real conditions, and permanently records what you've earned.
            </p>
          </div>

          <div className="space-y-0 divide-y divide-border border border-border rounded-xl overflow-hidden">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group flex items-start gap-5 p-6 bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="mt-0.5 shrink-0 h-9 w-9 rounded-lg border border-border bg-background flex items-center justify-center">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="font-semibold text-card-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                    {description}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-border shrink-0 mt-1 hidden group-hover:block transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security/proctoring callout ── */}
      <section className="border-t border-border py-20 md:py-24 bg-muted/20">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center max-w-5xl">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Exam integrity</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
                Professional assessment, not just practice
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Proctored coding exams with real-time integrity monitoring. Hosts control the session;
                participants submit solutions that are executed and scored live. Results and
                certificates are written to the blockchain — no trust required.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/auth/signup">
                    Create free account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg">
                  <Link href="/auth/login">Sign in</Link>
                </Button>
              </div>
            </div>

            {/* Exam integrity visual */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-card-foreground">Live Exam Session</p>
                  <p className="text-xs text-muted-foreground">Room ABC123 · 14 participants</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-600 dark:text-emerald-400">Active</span>
                </span>
              </div>

              {[
                { name: "alice_dev", lang: "Python", status: "Submitted", score: "3/3" },
                { name: "bob_codes", lang: "TypeScript", status: "Running", score: "2/3" },
                { name: "carol_xyz", lang: "Rust", status: "In progress", score: "—" },
              ].map(({ name, lang, status, score }) => (
                <div key={name} className="flex items-center gap-3 text-sm">
                  <div className="h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                    {name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-card-foreground truncate">{name}</p>
                    <p className="text-xs text-muted-foreground">{lang}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{status}</p>
                    <p className="text-xs font-medium text-foreground">{score}</p>
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Certificate minted on-chain upon completion
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 bg-background">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs font-semibold text-foreground">OpenLearnX</p>
          <p className="text-xs text-muted-foreground text-center">
            Open-source. AI-adaptive. Blockchain-verified.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link href="/courses" className="hover:text-foreground transition-colors">Courses</Link>
            <Link href="/coding" className="hover:text-foreground transition-colors">Coding</Link>
            <Link href="/quizzes" className="hover:text-foreground transition-colors">Quizzes</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
