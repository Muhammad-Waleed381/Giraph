import { DashboardHeader } from "@/components/dashboard/header"
import { AskHeader } from "@/components/ask/ask-header"
import { AskInterface } from "@/components/ask/ask-interface"
import { QuestionHistory } from "@/components/ask/question-history"

export default function AskQuestionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <AskHeader />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AskInterface />
          </div>
          <div className="lg:col-span-1">
            <QuestionHistory />
          </div>
        </div>
      </main>
    </div>
  )
}
