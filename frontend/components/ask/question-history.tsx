"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, RefreshCw, Trash2, Brain, BarChart2, ListOrdered } from "lucide-react"
import type { Answer, DisplayResponseType } from "./ask-interface"; // Import shared Answer type
import { useTheme } from 'next-themes'

interface QuestionHistoryProps {
  history: Answer[];
  onRerunQuestion: (answer: Answer) => void;
  onDeleteQuestion?: (id: string) => void;
}

export function QuestionHistory({ history = [], onRerunQuestion, onDeleteQuestion }: QuestionHistoryProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const formatTimestamp = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }

  const handleDeleteQuestion = (id: string) => {
    if (onDeleteQuestion) {
      onDeleteQuestion(id);
    } else {
      // Fallback to local handling if no callback provided
      try {
        const storedHistory = localStorage.getItem("questionHistory");
        if (storedHistory) {
          const currentHistory = JSON.parse(storedHistory) as Answer[];
          const updatedHistory = currentHistory.filter((item) => item.id !== id);
          localStorage.setItem("questionHistory", JSON.stringify(updatedHistory));
          // Note: We don't update internal state since history is now controlled by parent
        }
      } catch (e) {
        console.error("Failed to delete question from history:", e);
      }
    }
  }

  const getResponseIcon = (type: DisplayResponseType) => {
    switch(type) {
        case 'summary': return <Brain className="h-4 w-4" />;
        case 'chart': return <BarChart2 className="h-4 w-4" />;
        case 'table': return <ListOrdered className="h-4 w-4" />;
        default: return <Brain className="h-4 w-4" />; // Default icon
    }
  }

  const getBadgeStyles = (type: DisplayResponseType) => {
    if (isDark) {
      switch(type) {
        case 'summary': return 'bg-blue-900/70 text-blue-200';
        case 'chart': return 'bg-teal-900/70 text-teal-200';
        case 'table': return 'bg-purple-900/70 text-purple-200';
        default: return 'bg-slate-800/70 text-slate-200';
      }
    } else {
      switch(type) {
        case 'summary': return 'bg-blue-100 text-blue-800';
        case 'chart': return 'bg-teal-100 text-teal-800';
        case 'table': return 'bg-purple-100 text-purple-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Recent Questions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 py-0 max-h-96 overflow-y-auto">
        {history && history.length > 0 ? (
          <ul className="divide-y divide-border">
            {history.map((item) => item && (
              <li key={item.id || `item-${Math.random()}`} className={`px-4 py-3 hover:bg-accent/50`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onRerunQuestion(item)}>
                    <p className="truncate text-sm font-medium" title={item.question}>{item.question || 'Unnamed question'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getBadgeStyles(item.responseType || 'summary')}`}
                      >
                        {getResponseIcon(item.responseType || 'summary')}
                        {(item.responseType || 'Result').charAt(0).toUpperCase() + (item.responseType || 'Result').slice(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">on {item.collectionName || 'unknown'}</span>
                      <span className="text-xs text-muted-foreground">{formatTimestamp(item.timestamp || new Date())}</span>
                    </div>
                  </div>
                  <div className="flex ml-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                      onClick={() => onRerunQuestion(item)}
                      title="Re-run question"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span className="sr-only">Re-run question</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                      onClick={() => handleDeleteQuestion(item.id)}
                      title="Delete question"
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
          <div className="py-6 text-center text-muted-foreground">
            <p>No recent questions yet. Ask something!</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
