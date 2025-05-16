"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2, Search, HelpCircle } from "lucide-react"
import { DatasetSelector } from "@/components/insights/dataset-selector"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface InsightsGeneratorProps {
  onGenerateInsights?: () => void
}

export function InsightsGenerator({ onGenerateInsights }: InsightsGeneratorProps) {
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [deepAnalysisMode, setDeepAnalysisMode] = useState(false)

  const handleGenerateInsights = async () => {
    if (!selectedDataset) return

    setIsGenerating(true)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 3000))

    setIsGenerating(false)

    // Call the parent component's handler if provided
    if (onGenerateInsights) {
      onGenerateInsights()
    }

    // In a real app, this would trigger the insights generation process
    // and update the state in a parent component or context
  }

  return (
    <Card className="mb-6 border-gray-800 bg-gray-800">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <DatasetSelector selectedDataset={selectedDataset} onSelectDataset={setSelectedDataset} />

            <div className="flex items-center space-x-2">
              <Switch
                id="deep-analysis"
                checked={deepAnalysisMode}
                onCheckedChange={setDeepAnalysisMode}
                disabled={isGenerating}
              />
              <Label htmlFor="deep-analysis" className="flex items-center gap-2 text-gray-300">
                Deep Analysis Mode
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help text-gray-400 hover:text-gray-300">
                        <HelpCircle className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="max-w-xs">
                        Deep analysis takes longer but provides more detailed insights and discovers subtle patterns in
                        your data.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
            </div>
          </div>

          <div className="flex flex-col justify-end space-y-4">
            <div className="text-sm text-gray-400">
              {deepAnalysisMode
                ? "Deep analysis may take 1-2 minutes to complete."
                : "Standard analysis typically takes 15-30 seconds."}
            </div>
            <Button
              onClick={handleGenerateInsights}
              disabled={!selectedDataset || isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Insights...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />Generate Insights
                </>
              )}
            </Button>
          </div>
        </div>

        {!selectedDataset && (
          <div className="mt-4 rounded-md bg-gray-700/50 p-4 text-center border border-gray-700">
            <p className="text-gray-300">Select a dataset to generate AI-powered insights.</p>
            <Button className="mt-2 bg-blue-600 hover:bg-blue-700">Go to Connect Data</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
