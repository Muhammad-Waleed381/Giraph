"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, RefreshCw, PlusCircle, ThumbsUp, ThumbsDown, AlertTriangle } from "lucide-react"
import { EChartDisplay } from "@/components/charts/echart-display"
import type { Answer, DisplayResponseType } from "@/components/ask/ask-interface"
import { useTheme } from 'next-themes'

interface AnswerDisplayProps {
  answer: Answer;
}

export function AnswerDisplay({ answer }: AnswerDisplayProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<"positive" | "negative" | null>(null)
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const handleFeedback = (type: "positive" | "negative") => {
    setFeedbackGiven(type)
    console.log(`Feedback for answer ${answer.id}: ${type}`);
  }

  const handleExport = () => {
    alert(
      `Exporting ${answer.responseType} for question "${answer.question}" as ${answer.responseType === "summary" ? "TXT" : answer.responseType === "chart" ? "PNG/SVG" : "CSV"}`,
    )
  }

  const handleAddToDashboard = () => {
    alert(`Adding to dashboard: ${answer.question}`);
  }

  const handleRegenerate = () => {
    alert(`Regenerating answer for: ${answer.question}`);
  }

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(date)
  }

  const getDisplayIconAndLabel = (type: DisplayResponseType) => {
    switch (type) {
      case "summary": return { icon: "🧠", label: "Summary" };
      case "chart": return { icon: "📊", label: "Chart" };
      case "table": return { icon: "📄", label: "Table" };
      case "error": return { icon: "⚠️", label: "Error" };
      default: return { icon: "❓", label: "Result" };
    }
  };

  const { icon, label } = getDisplayIconAndLabel(answer.responseType);

  // Determine the appropriate colors based on the theme and response type
  const getCardStyles = () => {
    if (answer.responseType === 'error') {
      return {
        card: isDark ? 'border-red-700 bg-red-950/30' : 'border-red-300 bg-red-50',
        header: isDark ? 'bg-red-950/50' : 'bg-red-100',
        title: isDark ? 'text-red-300' : 'text-red-700',
        badge: isDark ? 'bg-red-900 text-red-200' : 'bg-red-200 text-red-800',
      };
    }
    
    return {
      card: isDark ? 'border-blue-900/50' : 'border-teal-200',
      header: isDark ? 'bg-gradient-to-r from-blue-950/50 to-slate-900/50' : 'bg-gradient-to-r from-teal-50 to-blue-50',
      title: isDark ? 'text-slate-200' : 'text-gray-800',
      badge: isDark ? 'bg-blue-900/70 text-blue-200' : 'bg-teal-100 text-teal-800',
    };
  };
  
  const styles = getCardStyles();

  return (
    <Card className={`overflow-hidden ${styles.card} shadow-md transition-all hover:shadow-lg chart-card`}>
      <CardHeader className={`pb-3 ${styles.header}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge}`}>
                {icon} {label}
              </span>
              <span className="text-xs text-muted-foreground">{formatTimestamp(answer.timestamp)}</span>
            </div>
            <CardTitle className={`mt-1 text-lg font-medium ${styles.title}`}>{answer.question}</CardTitle>
            {answer.responseType === 'summary' && answer.naturalLanguageAnswer && (
                <p className="mt-2 text-sm text-foreground/80">
                    {answer.naturalLanguageAnswer}
                </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {answer.responseType === "summary" && !answer.naturalLanguageAnswer && answer.content.text && (
          <div className="prose max-w-none dark:prose-invert">
            <p className="whitespace-pre-line text-foreground/90">{answer.content.text}</p>
          </div>
        )}

        {answer.responseType === "chart" && (
          <div className="h-[400px] w-full min-h-[300px] chart-container">
            {answer.content.option ? (
                <EChartDisplay option={answer.content.option} />
            ) : (
                <p className="text-muted-foreground">Chart data is not available or incomplete.</p>
            )}
          </div>
        )}

        {answer.responseType === "table" && (
          <div className="overflow-x-auto">
            {answer.content.rows && answer.content.rows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {answer.content.headers.map((header: string, index: number) => (
                      <TableHead key={index}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {answer.content.rows.map((row: any[], rowIndex: number) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell: any, cellIndex: number) => (
                        <TableCell key={cellIndex}>{typeof cell === 'object' ? JSON.stringify(cell) : cell}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">No table data to display.</p>
            )}
          </div>
        )}
        {answer.responseType === "error" && (
            <div className="flex flex-col items-center justify-center text-destructive">
                <AlertTriangle className="h-12 w-12 mb-2" />
                <p className="font-semibold">An Error Occurred</p>
                <p className="text-sm">{answer.content.message || "Could not process the request."}</p>
            </div>
        )}
      </CardContent>

      {answer.responseType !== 'error' && answer.responseType !== 'summary' && (
        <CardFooter className="flex items-center justify-between border-t dark:border-border px-6 py-3">
            <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Was this helpful?</span>
            <Button
                variant="outline"
                size="sm"
                className={`${feedbackGiven === "positive" ? (isDark ? "bg-green-950 text-green-300 border-green-800" : "bg-green-50 text-green-600 border-green-200") : ""}`}
                onClick={() => handleFeedback("positive")}
                disabled={feedbackGiven !== null}
            >
                <ThumbsUp className="mr-1 h-3.5 w-3.5" />
                Yes
            </Button>
            <Button
                variant="outline"
                size="sm"
                className={`${feedbackGiven === "negative" ? (isDark ? "bg-red-950 text-red-300 border-red-800" : "bg-red-50 text-red-600 border-red-200") : ""}`}
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
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700" onClick={handleAddToDashboard}>
                <PlusCircle className="mr-1 h-3.5 w-3.5" />
                Add to Dashboard
            </Button>
            </div>
        </CardFooter>
      )}
    </Card>
  )
}
