"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, RefreshCw, PlusCircle, ThumbsUp, ThumbsDown } from "lucide-react"
import { BarChart } from "@/components/charts/bar-chart"

interface AnswerDisplayProps {
  answer: {
    id: string
    question: string
    responseType: "summary" | "chart" | "table"
    content: any
    timestamp: Date
  }
}

export function AnswerDisplay({ answer }: AnswerDisplayProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<"positive" | "negative" | null>(null)

  const handleFeedback = (type: "positive" | "negative") => {
    setFeedbackGiven(type)
    // In a real app, you would send this feedback to your backend
  }

  const handleExport = () => {
    // In a real app, this would trigger an export based on the response type
    alert(
      `Exporting ${answer.responseType} as ${answer.responseType === "summary" ? "PDF" : answer.responseType === "chart" ? "PNG" : "CSV"}`,
    )
  }

  const handleAddToDashboard = () => {
    // In a real app, this would add the visualization to the user's dashboard
    alert("Added to dashboard!")
  }

  const handleRegenerate = () => {
    // In a real app, this would trigger a regeneration of the answer
    alert("Regenerating answer...")
  }

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(date)
  }

  return (
    <Card className="overflow-hidden border-teal-200 shadow-md transition-all hover:shadow-lg">
      <CardHeader className="bg-gradient-to-r from-teal-50 to-blue-50 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
                {answer.responseType === "summary"
                  ? "🧠 Summary"
                  : answer.responseType === "chart"
                    ? "📊 Chart"
                    : "📄 Table"}
              </span>
              <span className="text-xs text-gray-500">{formatTimestamp(answer.timestamp)}</span>
            </div>
            <CardTitle className="mt-1 text-lg font-medium text-gray-800">{answer.question}</CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {answer.responseType === "summary" && (
          <div className="prose max-w-none">
            <p className="whitespace-pre-line text-gray-700">{answer.content.text}</p>
          </div>
        )}

        {answer.responseType === "chart" && (
          <div className="h-80 w-full">
            <BarChart
              data={{
                labels: answer.content.data.labels,
                datasets: [
                  {
                    label: answer.content.title,
                    data: answer.content.data.values,
                    backgroundColor: "rgba(20, 184, 166, 0.8)",
                  },
                ],
              }}
            />
          </div>
        )}

        {answer.responseType === "table" && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {answer.content.headers.map((header: string, index: number) => (
                    <TableHead key={index}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {answer.content.rows.map((row: string[], rowIndex: number) => (
                  <TableRow key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <TableCell key={cellIndex}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t bg-gray-50 px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Was this helpful?</span>
          <Button
            variant="outline"
            size="sm"
            className={`${feedbackGiven === "positive" ? "bg-green-50 text-green-600 border-green-200" : ""}`}
            onClick={() => handleFeedback("positive")}
            disabled={feedbackGiven !== null}
          >
            <ThumbsUp className="mr-1 h-3.5 w-3.5" />
            Yes
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`${feedbackGiven === "negative" ? "bg-red-50 text-red-600 border-red-200" : ""}`}
            onClick={() => handleFeedback("negative")}
            disabled={feedbackGiven !== null}
          >
            <ThumbsDown className="mr-1 h-3.5 w-3.5" />
            No
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRegenerate}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Regenerate
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1 h-3.5 w-3.5" />
            Export
          </Button>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={handleAddToDashboard}>
            <PlusCircle className="mr-1 h-3.5 w-3.5" />
            Add to Dashboard
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
