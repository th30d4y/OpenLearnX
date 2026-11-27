"use client"

interface PasswordStrengthProps {
  password: string
}

const LEVELS = [
  { label: "Too short", color: "bg-red-500", text: "text-red-600" },
  { label: "Weak", color: "bg-orange-500", text: "text-orange-600" },
  { label: "Fair", color: "bg-yellow-500", text: "text-yellow-600" },
  { label: "Good", color: "bg-lime-500", text: "text-lime-600" },
  { label: "Strong", color: "bg-green-500", text: "text-green-600" },
]

/** Returns 0 (too short) to 4 (strong). */
export function scorePassword(password: string): number {
  if (password.length < 6) return 0
  let score = 1
  if (password.length >= 10) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  return Math.min(score, 4)
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null
  const score = scorePassword(password)
  const level = LEVELS[score]

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded ${i < Math.max(score, 1) ? level.color : "bg-gray-200 dark:bg-gray-700"}`}
          />
        ))}
      </div>
      <p className={`mt-1 text-xs ${level.text}`}>Password strength: {level.label}</p>
    </div>
  )
}
