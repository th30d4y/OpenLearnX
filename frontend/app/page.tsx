import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Brain,
  BookOpen,
  Code2,
  Trophy,
  Zap,
  Shield,
  Users,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"

const FEATURES = [
  {
    icon: Brain,
    title: "AI-Adaptive Learning",
    description:
      "Curriculum that adjusts in real time to your pace, strengths, and gaps — no two paths are the same.",
  },
  {
    icon: Code2,
    title: "Live Code Practice",
    description:
      "In-browser editor with instant feedback across 15+ languages. Solve problems, join exams, compete live.",
  },
  {
    icon: Trophy,
    title: "Blockchain Certificates",
    description:
      "On-chain certificates verified by smart contracts. Tamper-proof proof of every skill you earn.",
  },
  {
    icon: Zap,
    title: "Adaptive Quizzes",
    description:
      "AI-generated quizzes calibrated to your current level, with detailed explanations for every answer.",
  },
  {
    icon: Shield,
    title: "Proctored Exams",
    description:
      "Secure, real-time coding exams with integrity monitoring — ideal for professional certification.",
  },
  {
    icon: TrendingUp,
    title: "Progress Analytics",
    description:
      "Rich dashboards tracking XP, streaks, time spent, and rank — so you always know where you stand.",
  },
]

const STATS = [
  { value: "50+", label: "Courses" },
  { value: "200+", label: "Coding Problems" },
  { value: "15+", label: "Languages" },
  { value: "On-chain", label: "Certificates" },
]

const WHY_ITEMS = [
  "Adaptive curriculum powered by real AI",
  "Instant feedback on every submission",
  "Verifiable blockchain credentials",
  "Live multiplayer quizzes & exams",
  "Detailed learning analytics",
  "Works on any device",
]

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative py-20 md:py-32 lg:py-40 border-b border-border overflow-hidden">
        {/* Subtle background gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />

        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              AI-powered · Blockchain-certified · Open source
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-balance leading-[1.1]">
              Learn smarter.
              <br />
              <span className="text-primary">Earn faster.</span>
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto text-balance leading-relaxed">
              OpenLearnX adapts to you — AI-curated courses, live coding challenges, and blockchain
              certificates that prove what you actually know.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
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
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-b border-border bg-muted/40 py-10">
        <div className="container">
          <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <dt className="text-2xl font-bold text-foreground">{value}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-14 animate-slide-up">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to level up
            </h2>
            <p className="mt-4 text-muted-foreground text-balance">
              One platform for structured learning, hands-on practice, and verifiable credentials.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-card-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why OpenLearnX ── */}
      <section className="border-t border-border bg-muted/40 py-20 md:py-28">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Built for serious learners
              </h2>
              <p className="mt-4 text-muted-foreground text-balance leading-relaxed">
                Most platforms give you video lectures and multiple-choice tests. OpenLearnX gives you
                an intelligent system that identifies your weakest areas, challenges you in real code,
                and rewards you with credentials that actually mean something.
              </p>
              <ul className="mt-8 space-y-3">
                {WHY_ITEMS.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/auth/signup">
                    Get started free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Visual panel */}
            <div className="rounded-2xl border border-border bg-card p-8 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-card-foreground">React Fundamentals</p>
                  <p className="text-xs text-muted-foreground">7 modules · 42 lessons</p>
                </div>
                <div className="ml-auto text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  68% done
                </div>
              </div>
              <div className="space-y-2">
                {["Hooks & State", "Component Patterns", "Performance Optimization"].map(
                  (lesson, i) => (
                    <div
                      key={lesson}
                      className="flex items-center gap-3 rounded-lg p-3 bg-muted/60"
                    >
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center ${
                          i < 2 ? "bg-primary" : "border-2 border-border"
                        }`}
                      >
                        {i < 2 && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span className="text-sm text-card-foreground">{lesson}</span>
                    </div>
                  )
                )}
              </div>
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Next: Performance Optimization</span>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Continue →
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-border py-20 md:py-28">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Start your learning journey today
            </h2>
            <p className="mt-4 text-muted-foreground text-balance">
              Free to start. No credit card required. Connect a MetaMask wallet or sign up with
              email — begin learning in under a minute.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 bg-muted/40">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <BookOpen className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">OpenLearnX</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Open-source learning platform with AI and blockchain integration.
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
