"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, PlusCircle, ThumbsUp, ThumbsDown } from "lucide-react"
import { LineChart } from "@/components/charts/line-chart"
import { BarChart } from "@/components/charts/bar-chart"
import { PieChart } from "@/components/charts/pie-chart"

interface InsightCardProps {
  insight: {
    id: string
    title: string
    type: string
    chartType: string
    summary: string
    data: {
      labels: string[]
      values: number[]
    }
  }
  animationDelay?: number
  onFeedback?: (id: string, isPositive: boolean) => void
}

export function InsightCard({ insight, animationDelay = 0, onFeedback }: InsightCardProps) {
  const [visible, setVisible] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState<"positive" | "negative" | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true)
    }, animationDelay)

    return () => clearTimeout(timer)
  }, [animationDelay])

  const handleFeedback = (isPositive: boolean) => {
    setFeedbackGiven(isPositive ? "positive" : "negative")
    if (onFeedback) {
      onFeedback(insight.id, isPositive)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "trend":
        return "📈"
      case "performance":
        return "🏆"
      case "anomaly":
        return "⚠️"
      case "segmentation":
        return "🧩"
      case "forecast":
        return "🔮"
      default:
        return "🧠"
    }
  }

  const renderChart = () => {
    const chartData = {
      labels: insight.data.labels,
      datasets: [
        {
          label: insight.title,
          data: insight.data.values,
          backgroundColor:
            insight.chartType === "pie"
              ? [
                  "rgba(20, 184, 166, 0.8)",
                  "rgba(245, 158, 11, 0.8)",
                  "rgba(99, 102, 241, 0.8)",
                  "rgba(236, 72, 153, 0.8)",
                  "rgba(168, 85, 247, 0.8)",
                ]
              : "rgba(20, 184, 166, 0.8)",
          borderColor: insight.chartType === "line" ? "rgba(20, 184, 166, 1)" : undefined,
        },
      ],
    }

    switch (insight.chartType) {
      case "line":
        return <LineChart data={chartData} />
      case "bar":
        return <BarChart data={chartData} />
      case "pie":
        return <PieChart data={chartData} />
      default:
        return <BarChart data={chartData} />
    }
  }

  return (
    <Card
      className={`overflow-hidden transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-sm font-medium text-orange-800">
            {getTypeIcon(insight.type)} {insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}
          </span>
        </div>
        <CardTitle className="mt-2 text-lg">{insight.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-48 w-full">{renderChart()}</div>
        <p className="mt-4 text-sm text-gray-600">{insight.summary}</p>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t bg-gray-50 p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={`${feedbackGiven === "positive" ? "bg-green-50 text-green-600 border-green-200" : ""}`}
            onClick={() => handleFeedback(true)}
            disabled={feedbackGiven !== null}
          >
            <ThumbsUp className="mr-1 h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`${feedbackGiven === "negative" ? "bg-red-50 text-red-600 border-red-200" : ""}`}
            onClick={() => handleFeedback(false)}
            disabled={feedbackGiven !== null}
          >
            <ThumbsDown className="mr-1 h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
            <PlusCircle className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
