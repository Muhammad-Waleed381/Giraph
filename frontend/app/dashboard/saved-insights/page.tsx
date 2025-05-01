import { DashboardHeader } from "@/components/dashboard/header"
import { SavedInsightsHeader } from "@/components/saved-insights/saved-insights-header"
import { SavedInsightsFilters } from "@/components/saved-insights/saved-insights-filters"
import { SavedInsightsList } from "@/components/saved-insights/saved-insights-list"

export default function SavedInsightsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <SavedInsightsHeader />
        <SavedInsightsFilters />
        <SavedInsightsList />
      </main>
    </div>
  )
}
