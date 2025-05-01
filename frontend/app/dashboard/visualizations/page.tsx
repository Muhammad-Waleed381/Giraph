import type { Metadata } from "next"
import { VisualizationsHeader } from "@/components/visualizations/visualizations-header"
import { VisualizationsFilters } from "@/components/visualizations/visualizations-filters"
import { VisualizationsList } from "@/components/visualizations/visualizations-list"
import { EmptyState } from "@/components/visualizations/empty-state"

export const metadata: Metadata = {
  title: "Visualizations | Giraph",
  description: "Create and manage your data visualizations and dashboards",
}

export default function VisualizationsPage() {
  // In a real app, this would be fetched from an API
  const hasVisualizations = true

  return (
    <div className="flex flex-col h-full">
      <VisualizationsHeader />
      <div className="p-6 flex-1 overflow-auto">
        <VisualizationsFilters />
        {hasVisualizations ? <VisualizationsList /> : <EmptyState />}
      </div>
    </div>
  )
}
