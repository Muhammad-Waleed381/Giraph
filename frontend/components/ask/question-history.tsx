"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, RefreshCw, Trash2 } from "lucide-react"

export function QuestionHistory() {
  // Mock history data
  const [history, setHistory] = useState([
    {
      id: "q1",
      question: "What were the top 5 selling products in Q2?",
      type: "chart",
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
    },
    {
      id: "q2",
      question: "What is the average customer satisfaction score?",
      type: "summary",
      timestamp: new Date(Date.now() - 86400000), // 1 day ago
    },
    {
      id: "q3",
      question: "Show me monthly revenue for the past year",
      type: "chart",
      timestamp: new Date(Date.now() - 172800000), // 2 days ago
    },
    {
      id: "q4",
      question: "Which customer segment has the highest retention rate?",
      type: "table",
      timestamp: new Date(Date.now() - 259200000), // 3 days ago
    },
  ])

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`
    }
  }

  const handleDeleteQuestion = (id: string) => {
    setHistory(history.filter((item) => item.id !== id))
  }

  const handleRerunQuestion = (id: string) => {
    // In a real app, this would trigger the question to be re-run
    alert(`Re-running question: ${history.find((item) => item.id === id)?.question}`)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-gray-500" />
          Recent Questions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 py-0">
        {history.length > 0 ? (
          <ul className="divide-y">
            {history.map((item) => (
              <li key={item.id} className="px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{item.question}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.type === "summary"
                            ? "bg-blue-100 text-blue-800"
                            : item.type === "chart"
                              ? "bg-teal-100 text-teal-800"
                              : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {item.type === "summary" ? "🧠" : item.type === "chart" ? "📊" : "📄"}{" "}
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </span>
                      <span className="text-xs text-gray-500">{formatTimestamp(item.timestamp)}</span>
                    </div>
                  </div>
                  <div className="flex ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-teal-600"
                      onClick={() => handleRerunQuestion(item.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span className="sr-only">Re-run question</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-red-600"
                      onClick={() => handleDeleteQuestion(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete question</span>
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-6 text-center text-gray-500">
            <p>No recent questions</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
