"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Download, PlusCircle, AlertCircle } from "lucide-react"
import { InsightCard } from "@/components/insights/insight-card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function InsightsDisplay() {
  const [insights, setInsights] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Simulate loading insights on component mount
  useEffect(() => {
    // This would normally be triggered by a parent component or context
    // based on user interaction with the InsightsGenerator
    generateMockInsights()
  }, [])

  const generateMockInsights = () => {
    setIsLoading(true)

    // Simulate API delay
    setTimeout(() => {
      const mockInsights = [
        {
          id: "insight-1",
          title: "Sales peaked in March 2023",
          type: "trend",
          chartType: "line",
          summary:
            "Your sales showed a significant 23% increase in March 2023 compared to the previous month, making it your best performing period in Q1.",
          data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            values: [42, 58, 85, 75, 62, 70],
          },
        },
        {
          id: "insight-2",
          title: "Electronics is your top category",
          type: "performance",
          chartType: "bar",
          summary:
            "Electronics accounts for 45% of your total sales, outperforming all other product categories by a significant margin.",
          data: {
            labels: ["Electronics", "Clothing", "Home", "Beauty", "Sports"],
            values: [45, 25, 15, 10, 5],
          },
        },
        {
          id: "insight-3",
          title: "Unusual spike in returns detected",
          type: "anomaly",
          chartType: "line",
          summary:
            "There was an unusual 34% increase in product returns during the week of April 15th, primarily affecting the Clothing category.",
          data: {
            labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"],
            values: [5, 7, 6, 22, 8, 6],
          },
        },
        {
          id: "insight-4",
          title: "Customer segmentation by purchase frequency",
          type: "segmentation",
          chartType: "pie",
          summary:
            "Your customer base is divided into three main segments: 15% are frequent buyers (5+ purchases), 35% are regular (2-4 purchases), and 50% are one-time purchasers.",
          data: {
            labels: ["One-time", "Regular", "Frequent"],
            values: [50, 35, 15],
          },
        },
        {
          id: "insight-5",
          title: "Revenue forecast shows growth trend",
          type: "forecast",
          chartType: "line",
          summary:
            "Based on current trends, your revenue is projected to grow by approximately 18% in the next quarter, with the strongest growth in the Electronics category.",
          data: {
            labels: ["Q1", "Q2", "Q3", "Q4", "Q1 (Forecast)", "Q2 (Forecast)"],
            values: [100, 120, 115, 135, 150, 165],
          },
        },
      ]

      setInsights(mockInsights)
      setIsLoading(false)
    }, 1000)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-16 w-16 animate-pulse rounded-full bg-blue-900/50 flex items-center justify-center">
          <span className="text-2xl text-blue-400">⚡</span>
        </div>
        <h3 className="mt-4 text-lg font-medium text-white">Generating insights...</h3>
        <p className="mt-1 text-sm text-gray-400">Our AI is analyzing your data to find meaningful patterns.</p>
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center border-gray-800 bg-gray-800">
        <div className="rounded-full bg-gray-700 p-4">
          <AlertCircle className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-white">No insights generated yet</h3>
        <p className="mt-2 text-sm text-gray-400 max-w-md">
          Select a dataset and click &quot;Generate Insights&quot; to discover patterns and trends in your data.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-900/20 border-blue-800/50">
        <AlertCircle className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-300">
          Insights are generated using AI and may include approximations. You can provide feedback to improve future
          results.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          {insights.length} Insights Generated <span className="text-sm font-normal text-gray-400">(May 1, 2023)</span>
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">
            <Download className="mr-1 h-3.5 w-3.5" />
            Save Report
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="mr-1 h-3.5 w-3.5" />
            Add All to Dashboard
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight, index) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            animationDelay={index * 150}
            onFeedback={(id, isPositive) => {
              console.log(`Feedback for insight ${id}: ${isPositive ? "positive" : "negative"}`)
              // In a real app, this would send feedback to the backend
            }}
          />
        ))}
      </div>
    </div>
  )
}
