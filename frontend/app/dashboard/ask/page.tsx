"use client"

import { AskHeader } from "@/components/ask/ask-header"
import { AskInterface } from "@/components/ask/ask-interface"

export default function AskPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <AskHeader />
      <AskInterface />
    </div>
  )
}
