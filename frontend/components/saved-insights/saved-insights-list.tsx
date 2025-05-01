"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Download,
  MoreVertical,
  PlusCircle,
  Star,
  Trash2,
  Maximize2,
  FileBarChart,
  AlertCircle,
  Zap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/saved-insights/empty-state"
import { BulkActionBar } from "@/components/saved-insights/bulk-action-bar"

// Mock data for saved insights
const mockInsights = [
  {
    id: "insight-1",
    title: "Sales peaked in March 2023",
    description:
      "Your sales showed a significant 23% increase in March 2023 compared to the previous month, making it your best performing period in Q1.",
    type: "trend",
    dataset: "Sales Data",
    date: "2023-05-01",
    chartType: "line",
    isPinned: true,
  },
  {
    id: "insight-2",
    title: "Electronics is your top category",
    description:
      "Electronics accounts for 45% of your total sales, outperforming all other product categories by a significant margin.",
    type: "performance",
    dataset: "Product Database",
    date: "2023-04-28",
    chartType: "bar",
    isPinned: false,
  },
  {
    id: "insight-3",
    title: "Unusual spike in returns detected",
    description:
      "There was an unusual 34% increase in product returns during the week of April 15th, primarily affecting the Clothing category.",
    type: "anomaly",
    dataset: "Sales Data",
    date: "2023-04-25",
    chartType: "line",
    isPinned: false,
  },
  {
    id: "insight-4",
    title: "Customer segmentation by purchase frequency",
    description:
      "Your customer base is divided into three main segments: 15% are frequent buyers (5+ purchases), 35% are regular (2-4 purchases), and 50% are one-time purchasers.",
    type: "segmentation",
    dataset: "Customer Survey",
    date: "2023-04-20",
    chartType: "pie",
    isPinned: true,
  },
  {
    id: "insight-5",
    title: "Revenue forecast shows growth trend",
    description:
      "Based on current trends, your revenue is projected to grow by approximately 18% in the next quarter, with the strongest growth in the Electronics category.",
    type: "forecast",
    dataset: "Sales Data",
    date: "2023-04-15",
    chartType: "line",
    isPinned: false,
  },
  {
    id: "insight-6",
    title: "Customer satisfaction declining for Product C",
    description:
      "Customer satisfaction scores for Product C have declined by 12% over the past 3 months, with most complaints related to durability issues.",
    type: "anomaly",
    dataset: "Customer Survey",
    date: "2023-04-10",
    chartType: "line",
    isPinned: false,
  },
]

export function SavedInsightsList() {
  const [insights, setInsights] = useState(mockInsights)
  const [selectedInsights, setSelectedInsights] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Toggle selection of an insight
  const toggleSelection = (id: string) => {
    setSelectedInsights((prev) => {
      const newSelection = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      setShowBulkActions(newSelection.length > 0)
      return newSelection
    })
  }

  // Toggle pin status
  const togglePin = (id: string) => {
    setInsights((prev) =>
      prev.map((insight) => (insight.id === id ? { ...insight, isPinned: !insight.isPinned } : insight)),
    )
  }

  // Delete an insight
  const deleteInsight = (id: string) => {
    setInsights((prev) => prev.filter((insight) => insight.id !== id))
    setSelectedInsights((prev) => prev.filter((item) => item !== id))
  }

  // Delete selected insights
  const deleteSelected = () => {
    setInsights((prev) => prev.filter((insight) => !selectedInsights.includes(insight.id)))
    setSelectedInsights([])
    setShowBulkActions(false)
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)
  }

  // Get icon for insight type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "trend":
        return <FileBarChart className="h-4 w-4 text-blue-600" />
      case "performance":
        return <Zap className="h-4 w-4 text-orange-600" />
      case "anomaly":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case "segmentation":
        return <PlusCircle className="h-4 w-4 text-purple-600" />
      case "forecast":
        return <FileBarChart className="h-4 w-4 text-green-600" />
      default:
        return <FileBarChart className="h-4 w-4 text-gray-600" />
    }
  }

  // If no insights, show empty state
  if (insights.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-6">
      {showBulkActions && (
        <BulkActionBar
          selectedCount={selectedInsights.length}
          onDelete={deleteSelected}
          onClearSelection={() => {
            setSelectedInsights([])
            setShowBulkActions(false)
          }}
        />
      )}

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight) => (
            <Card key={insight.id} className="overflow-hidden transition-all hover:shadow-md">
              <CardHeader className="relative p-4 pb-0">
                <div className="absolute right-4 top-4 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${insight.isPinned ? "text-yellow-500" : "text-gray-400"}`}
                    onClick={() => togglePin(insight.id)}
                  >
                    <Star className="h-4 w-4" fill={insight.isPinned ? "currentColor" : "none"} />
                    <span className="sr-only">{insight.isPinned ? "Unpin" : "Pin"}</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => console.log("View insight", insight.id)}>
                        <Maximize2 className="mr-2 h-4 w-4" />
                        <span>View Full Insight</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => console.log("Export insight", insight.id)}>
                        <Download className="mr-2 h-4 w-4" />
                        <span>Export</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => console.log("Add to dashboard", insight.id)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>Add to Dashboard</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteInsight(insight.id)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mb-2 flex items-center gap-2">
                  <Checkbox
                    checked={selectedInsights.includes(insight.id)}
                    onCheckedChange={() => toggleSelection(insight.id)}
                    aria-label={`Select ${insight.title}`}
                  />
                  <Badge
                    variant="outline"
                    className={`${
                      insight.type === "anomaly"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : insight.type === "forecast"
                          ? "border-green-200 bg-green-50 text-green-700"
                          : insight.type === "segmentation"
                            ? "border-purple-200 bg-purple-50 text-purple-700"
                            : "border-blue-200 bg-blue-50 text-blue-700"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {getTypeIcon(insight.type)}
                      <span className="capitalize">{insight.type}</span>
                    </div>
                  </Badge>
                </div>

                <h3 className="text-lg font-semibold">{insight.title}</h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <span>{insight.dataset}</span>
                  <span>•</span>
                  <span>Saved on {formatDate(insight.date)}</span>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                <div className="mb-3 h-32 rounded-md bg-gray-100 flex items-center justify-center">
                  <img
                    src={`/placeholder.svg?height=128&width=256&text=${insight.chartType} chart`}
                    alt={`${insight.title} chart`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="line-clamp-2 text-sm text-gray-600">{insight.description}</p>
              </CardContent>

              <CardFooter className="flex justify-between border-t bg-gray-50 p-4">
                <Button variant="ghost" size="sm" className="text-gray-600">
                  <Maximize2 className="mr-1 h-3.5 w-3.5" />
                  View
                </Button>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="text-gray-600">
                    <Download className="mr-1 h-3.5 w-3.5" />
                    Export
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-600">
                    <PlusCircle className="mr-1 h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="flex items-center gap-4 rounded-lg border bg-white p-4 transition-all hover:shadow-md"
            >
              <Checkbox
                checked={selectedInsights.includes(insight.id)}
                onCheckedChange={() => toggleSelection(insight.id)}
                aria-label={`Select ${insight.title}`}
              />

              <div className="h-16 w-16 flex-shrink-0 rounded bg-gray-100 flex items-center justify-center">
                <img
                  src={`/placeholder.svg?height=64&width=64&text=${insight.chartType}`}
                  alt={`${insight.title} chart`}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`${
                      insight.type === "anomaly"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : insight.type === "forecast"
                          ? "border-green-200 bg-green-50 text-green-700"
                          : insight.type === "segmentation"
                            ? "border-purple-200 bg-purple-50 text-purple-700"
                            : "border-blue-200 bg-blue-50 text-blue-700"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {getTypeIcon(insight.type)}
                      <span className="capitalize">{insight.type}</span>
                    </div>
                  </Badge>
                  {insight.isPinned && (
                    <Star className="h-3.5 w-3.5 text-yellow-500" fill="currentColor" strokeWidth={0} />
                  )}
                </div>
                <h3 className="mt-1 text-base font-semibold">{insight.title}</h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <span>{insight.dataset}</span>
                  <span>•</span>
                  <span>Saved on {formatDate(insight.date)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-gray-600">
                  <Maximize2 className="mr-1 h-3.5 w-3.5" />
                  View
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-600">
                  <Download className="mr-1 h-3.5 w-3.5" />
                  Export
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-600">
                  <PlusCircle className="mr-1 h-3.5 w-3.5" />
                  Add
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-600" onClick={() => togglePin(insight.id)}>
                  <Star
                    className={`h-3.5 w-3.5 ${insight.isPinned ? "text-yellow-500" : "text-gray-400"}`}
                    fill={insight.isPinned ? "currentColor" : "none"}
                  />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => deleteInsight(insight.id)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <div className="text-sm text-gray-500">Showing {insights.length} insights</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
