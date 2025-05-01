import { DashboardHeader } from "@/components/dashboard/header"
import { InsightsHeader } from "@/components/insights/insights-header"
import { InsightsGenerator } from "@/components/insights/insights-generator"
import { InsightsFilters } from "@/components/insights/insights-filters"
import { InsightsDisplay } from "@/components/insights/insights-display"

export default function AutoInsightsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <InsightsHeader />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <InsightsFilters />
          </div>
          <div className="lg:col-span-3">
            <InsightsGenerator />
            <InsightsDisplay />
          </div>
        </div>
      </main>
    </div>
  )
}
