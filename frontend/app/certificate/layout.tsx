import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Certificate",
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
