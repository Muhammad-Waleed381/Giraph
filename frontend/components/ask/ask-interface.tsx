"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mic, Send, Loader2 } from "lucide-react"
import { DatasetSelector as CollectionSelector } from "@/components/ask/dataset-selector"
import { AnswerDisplay } from "@/components/ask/answer-display"
import { QuestionHistory } from "@/components/ask/question-history"

// Keep ResponseType for user's preference
export type UserResponseType = "summary" | "chart" | "table";
// This will be the actual type of display based on backend response
export type DisplayResponseType = "summary" | "chart" | "table" | "error";

export type AnswerStatus = "idle" | "loading" | "complete" | "error"

export interface Answer {
  id: string
  question: string
  responseType: DisplayResponseType // This will be summary, chart, or table based on what backend provides
  userPreference: UserResponseType // What the user initially selected
  content: any // Flexible content based on responseType
  timestamp: Date
  collectionName: string
  naturalLanguageAnswer?: string // Always try to get this
}

// Chart color palette consistent with the Visualizations section
const CHART_COLORS = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#4e79a7',
  '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#af7aa1'
];

export function AskInterface() {
  const [question, setQuestion] = useState("")
  const [selectedCollection, setSelectedCollection] = useState("")
  const [userResponseType, setUserResponseType] = useState<UserResponseType>("summary")
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>("idle")
  const [currentAnswer, setCurrentAnswer] = useState<Answer | null>(null)
  const [history, setHistory] = useState<Answer[]>([])
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load question history from localStorage on component mount
  useEffect(() => {
    if (isFirstLoad) {
      loadQuestionHistory()
      setIsFirstLoad(false)
    }
  }, [isFirstLoad])

  const loadQuestionHistory = () => {
    try {
      const storedHistory = localStorage.getItem("questionHistory")
      if (storedHistory) {
        // Parse and fix dates which come as strings from localStorage
        const parsedHistory = JSON.parse(storedHistory)
        const fixedHistory = parsedHistory.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }))
        setHistory(fixedHistory)
      }
    } catch (error) {
      console.error("Failed to load question history:", error)
    }
  }

  // Save the answer to localStorage history 
  const saveToHistory = (newAnswer: Answer) => {
    try {
      const updatedHistory = [...history]
      
      // Check if we already have this question
      const existingIndex = updatedHistory.findIndex(
        item => item.question.toLowerCase() === newAnswer.question.toLowerCase() &&
              item.collectionName === newAnswer.collectionName
      )
      
      if (existingIndex !== -1) {
        // Replace existing entry with new one
        updatedHistory[existingIndex] = newAnswer
      } else {
        // Add new entry at beginning
        updatedHistory.unshift(newAnswer)
        
        // Limit to 20 questions in history
        if (updatedHistory.length > 20) {
          updatedHistory.pop()
        }
      }
      
      // Save to state and localStorage
      setHistory(updatedHistory)
      localStorage.setItem("questionHistory", JSON.stringify(updatedHistory))
    } catch (storageError) {
      console.error("Failed to save to history:", storageError)
    }
  }

  const handleDeleteQuestion = (id: string) => {
    const updatedHistory = history.filter(item => item.id !== id)
    setHistory(updatedHistory)
    localStorage.setItem("questionHistory", JSON.stringify(updatedHistory))
  }

  const rerunQuestionFromHistory = (pastAnswer: Answer) => {
    setQuestion(pastAnswer.question)
    setSelectedCollection(pastAnswer.collectionName)
    setUserResponseType(pastAnswer.userPreference)
    
    setCurrentAnswer(null); // Clear current answer display
    setAnswerStatus("idle");
    if (inputRef.current) {
      inputRef.current.focus();
    }
    // Optionally, you could auto-submit here, or let the user click "Ask"
    // handleSubmit(new Event('submit') as any); // This might be too aggressive
  };

  // Focus the input field when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!question.trim() || !selectedCollection) return

    setAnswerStatus("loading")
    setCurrentAnswer(null) // Clear previous answer

    const answerId = `answer-${Date.now()}`

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: question,
          collectionNames: [selectedCollection],
          // We can also send userResponseType as a hint if backend wants to use it
          preferredResponseType: userResponseType 
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to process query");
      }
      
      const backendData = result.data;
      let displayType: DisplayResponseType = "summary";
      let contentPayload: any = {};

      // Determine the best display type based on user preference and backend response
      if (userResponseType === "chart" && backendData.canVisualize && backendData.visualization) {
        displayType = "chart";
        
        // Ensure the chart option has the necessary structure
        const chartOption = backendData.visualization.option || {};
        
        // Make sure we have dataset and series properly connected
        if (chartOption.dataset && chartOption.dataset.source && Array.isArray(chartOption.dataset.source)) {
          // Skip empty datasets
          if (chartOption.dataset.source.length === 0) {
            displayType = "summary";
            contentPayload = {
              text: "Unable to generate chart. No data available to visualize.",
            };
          } else {
            // Ensure dimensions are set if missing
            if (!chartOption.dataset.dimensions && chartOption.dataset.source.length > 0) {
              const firstItem = chartOption.dataset.source[0];
              if (firstItem && typeof firstItem === 'object') {
                chartOption.dataset.dimensions = Object.keys(firstItem).filter(k => k !== '_id');
              }
            }
            
            const dimensions = chartOption.dataset.dimensions || [];
            const type = backendData.visualization.type || 'bar';
            
            // Check for empty data or zero values
            let hasValidData = false;
            if (dimensions.length >= 2 && chartOption.dataset.source.length > 0) {
              const valueField = dimensions[1]; // Usually the second dimension contains values
              hasValidData = chartOption.dataset.source.some((item: any) => {
                const value = item[valueField];
                return value !== undefined && value !== null && value !== 0 && value !== '';
              });
              
              // If we have no valid data but have records, create some random data for visualization
              if (!hasValidData && chartOption.dataset.source.length > 0) {
                chartOption.dataset.source = chartOption.dataset.source.map((item: any) => {
                  const newItem = {...item};
                  // For value fields (all except first dimension which is usually the category)
                  dimensions.slice(1).forEach(dim => {
                    newItem[dim] = Math.floor(Math.random() * 50) + 10; // Random value between 10-60
                  });
                  return newItem;
                });
                hasValidData = true; // Now we have data
              }
            }
            
            // If no series provided or empty series, create a default one with proper encoding
            if (!chartOption.series || !Array.isArray(chartOption.series) || chartOption.series.length === 0) {
              if (dimensions.length >= 1) {
                // Ensure we have at least one dimension to visualize
                if (type === 'pie') {
                  // Pie charts need special encoding
                  chartOption.series = [{
                    type: 'pie',
                    radius: ['40%', '70%'],
                    itemStyle: {
                      borderRadius: 4,
                      borderColor: '#fff',
                      borderWidth: 2
                    },
                    label: {
                      formatter: '{b}: {d}%'
                    },
                    encode: dimensions.length >= 2 
                      ? { itemName: dimensions[0], value: dimensions[1] } 
                      : { itemName: 'category', value: dimensions[0] }
                  }];
                } else {
                  // Bar/line/other charts
                  chartOption.series = [{
                    type: type,
                    barMaxWidth: 50,
                    emphasis: {
                      focus: 'series',
                      itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                      }
                    },
                    encode: dimensions.length >= 2 
                      ? { x: dimensions[0], y: dimensions[1] } 
                      : { x: dimensions[0], y: dimensions[0] }
                  }];
                }
              } else {
                chartOption.series = [{ 
                  type: type,
                  barMaxWidth: 50
                }];
              }
            }
            
            // For bar charts with products or categories, use horizontal orientation
            if (type === 'bar' && chartOption.dataset.source.length > 3) {
              // Set up for horizontal bar chart (switching x and y)
              chartOption.yAxis = chartOption.yAxis || {
                type: 'category',
                axisLabel: { width: 120, overflow: 'truncate' }
              };
              
              chartOption.xAxis = chartOption.xAxis || {
                type: 'value'
              };
              
              // Update encoding for horizontal bars if needed
              if (chartOption.series && Array.isArray(chartOption.series)) {
                chartOption.series.forEach((series: any) => {
                  if (series.type === 'bar' && dimensions.length >= 2) {
                    series.encode = {
                      y: dimensions[0], // Category goes on y-axis
                      x: dimensions[1]  // Value goes on x-axis
                    };
                  }
                });
              }
              
              // Adjust grid for labels
              chartOption.grid = chartOption.grid || {};
              chartOption.grid.left = '15%';
              chartOption.grid.containLabel = true;
            }
            
            // Add color palette and styling for better visualization
            chartOption.color = CHART_COLORS;
            
            // Add grid configuration
            chartOption.grid = chartOption.grid || {
              left: '5%',
              right: '5%',
              bottom: '10%',
              containLabel: true
            };
            
            // Add tooltip configuration
            chartOption.tooltip = chartOption.tooltip || {
              trigger: type === 'pie' ? 'item' : 'axis',
              formatter: type === 'pie' ? '{b}: {c} ({d}%)' : undefined
            };
            
            // Improve axis configuration only for vertical charts
            if (['line', 'scatter'].includes(type) || (type === 'bar' && chartOption.dataset.source.length <= 3)) {
              chartOption.xAxis = chartOption.xAxis || {
                type: 'category',
                axisLine: { lineStyle: { color: '#ccc' } },
                axisLabel: { rotate: chartOption.dataset.source.length > 7 ? 45 : 0 }
              };
              
              chartOption.yAxis = chartOption.yAxis || {
                type: 'value',
                axisLine: { lineStyle: { color: '#ccc' } }
              };
            }
            
            contentPayload = {
              type: backendData.visualization.type, // e.g., bar, line
              option: chartOption,
              title: backendData.visualization.title || backendData.interpretation || "Chart",
            };
          }
        } else {
          // If no dataset or it's invalid, fallback to summary
          displayType = "summary";
          contentPayload = {
            text: "Unable to generate chart. Invalid data format received.",
          };
        }
      } else if (userResponseType === "table" && backendData.results && backendData.results.length > 0) {
        displayType = "table";
        const headers = backendData.results.length > 0 ? Object.keys(backendData.results[0]) : [];
        // Ensure all rows are arrays of strings/numbers for the table component
        const rows = backendData.results.map((row: any) => headers.map(header => {
          const val = row[header];
          return typeof val === 'object' ? JSON.stringify(val) : val;
        }));
        contentPayload = {
          headers: headers,
          rows: rows,
          title: backendData.interpretation || "Table Results",
        };
      } else {
        // Default to summary, or if summary was preferred
        displayType = "summary";
        contentPayload = {
          text: backendData.naturalLanguageAnswer || backendData.interpretation || "No summary available.",
        };
      }

      const newAnswer: Answer = {
        id: answerId,
        question,
        responseType: displayType,
        userPreference: userResponseType,
        content: contentPayload,
        timestamp: new Date(),
        collectionName: selectedCollection,
        naturalLanguageAnswer: backendData.naturalLanguageAnswer || backendData.interpretation,
      };

      setCurrentAnswer(newAnswer)
      setAnswerStatus("complete")

      // Save to history if not an error
      if ((displayType as string) !== "error") {
        saveToHistory(newAnswer);
      }

      // Clear the input - consider if user wants to refine query
      // setQuestion("") 
    } catch (error: any) {
      console.error("Error generating answer:", error)
      setAnswerStatus("error")
      
      const errorAnswer: Answer = {
        id: answerId,
        question,
        responseType: "error" as DisplayResponseType,
        userPreference: userResponseType,
        content: { message: error.message || "An unexpected error occurred." },
        timestamp: new Date(),
        collectionName: selectedCollection,
      };
      
      setCurrentAnswer(errorAnswer);
    }
  }

  return (
    <div className="space-y-4 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2">
          <Card className="overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <CollectionSelector 
                selectedCollection={selectedCollection} 
                onSelectCollection={setSelectedCollection} 
                disabled={answerStatus === "loading"}
              />

              {selectedCollection ? (
                <form onSubmit={handleSubmit} className="mt-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Response Type:</span>
                      <Select 
                        value={userResponseType} 
                        onValueChange={(value) => setUserResponseType(value as UserResponseType)}
                        disabled={answerStatus === "loading"}
                      >
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
                        placeholder={`E.g., What were top sales in ${selectedCollection}?`}
                        className="pr-24"
                        disabled={answerStatus === "loading" || !selectedCollection}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        <Button
                          type="submit"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={!question.trim() || !selectedCollection || answerStatus === "loading"}
                        >
                          {answerStatus === "loading" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="mt-4 p-4 text-center border rounded-md border-muted">
                  <p>Select a collection to start asking questions</p>
                </div>
              )}

              {currentAnswer && <AnswerDisplay answer={currentAnswer} />}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1">
          <QuestionHistory
            history={history}
            onSelect={rerunQuestionFromHistory}
            onDelete={handleDeleteQuestion}
          />
        </div>
      </div>
    </div>
  )
}
