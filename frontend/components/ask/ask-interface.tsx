"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mic, Send, Loader2 } from "lucide-react"
import { DatasetSelector } from "@/components/ask/dataset-selector"
import { AnswerDisplay } from "@/components/ask/answer-display"

type ResponseType = "summary" | "chart" | "table"
type AnswerStatus = "idle" | "loading" | "complete" | "error"

interface Answer {
  id: string
  question: string
  responseType: ResponseType
  content: any
  timestamp: Date
}

export function AskInterface() {
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [question, setQuestion] = useState("")
  const [responseType, setResponseType] = useState<ResponseType>("summary")
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>("idle")
  const [currentAnswer, setCurrentAnswer] = useState<Answer | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the input field when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!question.trim() || !selectedDataset) return

    setAnswerStatus("loading")

    // Generate a unique ID for the answer
    const answerId = `answer-${Date.now()}`

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Create mock answer based on response type
      let mockContent

      if (responseType === "summary") {
        mockContent = {
          text: `Based on your data, here's what I found about "${question}":\n\nThere was a 23% increase in the metric you asked about during Q2 compared to Q1. The top performing category was "Electronics" with 45% of total sales. The average transaction value increased by $12.50 during this period.`,
        }
      } else if (responseType === "chart") {
        mockContent = {
          type: "bar",
          data: {
            labels: ["Product A", "Product B", "Product C", "Product D", "Product E"],
            values: [120, 98, 85, 65, 42],
          },
          title: "Top 5 Selling Products in Q2",
        }
      } else {
        mockContent = {
          headers: ["Product", "Units Sold", "Revenue", "% of Total"],
          rows: [
            ["Product A", "1,245", "$124,500", "32%"],
            ["Product B", "982", "$98,200", "25%"],
            ["Product C", "854", "$85,400", "22%"],
            ["Product D", "651", "$65,100", "17%"],
            ["Product E", "423", "$42,300", "11%"],
          ],
          title: "Top 5 Selling Products in Q2",
        }
      }

      const newAnswer: Answer = {
        id: answerId,
        question,
        responseType,
        content: mockContent,
        timestamp: new Date(),
      }

      setCurrentAnswer(newAnswer)
      setAnswerStatus("complete")

      // Add to history (would be handled by a parent component or context in a real app)
      // addToHistory(newAnswer)

      // Clear the input
      setQuestion("")
    } catch (error) {
      console.error("Error generating answer:", error)
      setAnswerStatus("error")
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <DatasetSelector selectedDataset={selectedDataset} onSelectDataset={setSelectedDataset} />

          {selectedDataset ? (
            <form onSubmit={handleSubmit} className="mt-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Response Type:</span>
                  <Select value={responseType} onValueChange={(value) => setResponseType(value as ResponseType)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">🧠 Smart Summary</SelectItem>
                      <SelectItem value="chart">📊 Chart / Graph</SelectItem>
                      <SelectItem value="table">📄 Table</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <Input
                    ref={inputRef}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="E.g., What were the top 5 selling products in Q2?"
                    className="pr-24"
                    disabled={answerStatus === "loading"}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full"
                      disabled={answerStatus === "loading"}
                    >
                      <Mic className="h-4 w-4" />
                      <span className="sr-only">Use voice input</span>
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700"
                      disabled={!question.trim() || answerStatus === "loading"}
                    >
                      {answerStatus === "loading" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="mr-1 h-3.5 w-3.5" />
                          Ask
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 flex items-center">
                  <span>🔒 We never store your questions. Your data is secure.</span>
                </div>
              </div>
            </form>
          ) : (
            <div className="mt-6 rounded-md bg-blue-50 p-4 text-center">
              <p className="text-blue-700">Please connect a dataset first to start asking questions.</p>
              <Button className="mt-2 bg-teal-600 hover:bg-teal-700">Go to Connect Data</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {answerStatus === "loading" && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <p className="text-lg font-medium text-gray-700">Analyzing your question...</p>
          </div>
          <p className="mt-2 text-sm text-gray-500">This may take a few moments</p>
        </div>
      )}

      {currentAnswer && answerStatus === "complete" && <AnswerDisplay answer={currentAnswer} />}

      {answerStatus === "error" && (
        <div className="rounded-md bg-red-50 p-6 text-center">
          <p className="text-red-700">Sorry, we couldn't process your question. Please try again.</p>
          <Button className="mt-2 bg-red-600 hover:bg-red-700" onClick={() => setAnswerStatus("idle")}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  )
}
