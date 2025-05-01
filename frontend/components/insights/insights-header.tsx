import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function InsightsHeader() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
          <span className="text-xl text-orange-600">⚡</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">Auto-Generated Insights</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-gray-400 hover:text-gray-600">
                    <HelpCircle className="h-5 w-5" />
                    <span className="sr-only">Learn more about auto insights</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-sm">
                  <p>
                    Our AI analyzes your dataset to automatically discover key trends, patterns, and anomalies without
                    you having to ask specific questions.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-gray-600">
            Let AI analyze your dataset and surface key trends, outliers, and growth areas—instantly.
          </p>
        </div>
      </div>
    </div>
  )
}
