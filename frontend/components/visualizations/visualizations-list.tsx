"use client"

import { useState } from "react"
import { VisualizationCard } from "@/components/visualizations/visualization-card"

// Mock data for visualizations
const mockVisualizations = [
  {
    id: "1",
    title: "Sales Performance Dashboard",
    description: "Overview of sales metrics and KPIs",
    type: "dashboard",
    thumbnail: "/placeholder.svg?height=200&width=300",
    lastUpdated: "2023-05-15T10:30:00Z",
    isFavorite: true,
    charts: 5,
    dataset: "Sales Data 2023",
  },
  {
    id: "2",
    title: "Customer Segmentation Analysis",
    description: "Visualization of customer segments and behaviors",
    type: "dashboard",
    thumbnail: "/placeholder.svg?height=200&width=300",
    lastUpdated: "2023-05-10T14:20:00Z",
    isFavorite: false,
    charts: 4,
    dataset: "Customer Database",
  },
  {
    id: "3",
    title: "Marketing Campaign Results",
    description: "Performance metrics for recent marketing campaigns",
    type: "dashboard",
    thumbnail: "/placeholder.svg?height=200&width=300",
    lastUpdated: "2023-05-08T09:15:00Z",
    isFavorite: true,
    charts: 6,
    dataset: "Marketing Analytics",
  },
  {
    id: "4",
    title: "Product Performance Metrics",
    description: "Analysis of product performance and trends",
    type: "dashboard",
    thumbnail: "/placeholder.svg?height=200&width=300",
    lastUpdated: "2023-05-05T16:45:00Z",
    isFavorite: false,
    charts: 3,
    dataset: "Product Database",
  },
  {
    id: "5",
    title: "Financial Overview",
    description: "Key financial metrics and projections",
    type: "dashboard",
    thumbnail: "/placeholder.svg?height=200&width=300",
    lastUpdated: "2023-05-03T11:30:00Z",
    isFavorite: true,
    charts: 7,
    dataset: "Financial Data",
  },
  {
    id: "6",
    title: "Operational Efficiency",
    description: "Metrics tracking operational efficiency and bottlenecks",
    type: "dashboard",
    thumbnail: "/placeholder.svg?height=200&width=300",
    lastUpdated: "2023-05-01T13:20:00Z",
    isFavorite: false,
    charts: 4,
    dataset: "Operations Data",
  },
]

export function VisualizationsList() {
  const [visualizations, setVisualizations] = useState(mockVisualizations)

  const toggleFavorite = (id: string) => {
    setVisualizations(visualizations.map((viz) => (viz.id === id ? { ...viz, isFavorite: !viz.isFavorite } : viz)))
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {visualizations.map((visualization) => (
        <VisualizationCard
          key={visualization.id}
          visualization={visualization}
          onToggleFavorite={() => toggleFavorite(visualization.id)}
        />
      ))}
    </div>
  )
}
