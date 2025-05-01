import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function AskHeader() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100">
          <span className="text-xl text-teal-600">❓</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">Ask Questions About Your Data</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-gray-400 hover:text-gray-600">
                    <HelpCircle className="h-5 w-5" />
                    <span className="sr-only">Learn more about asking questions</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-sm">
                  <p>
                    Ask questions in plain English and our AI will analyze your data to provide insights, charts, or
                    tables.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-gray-600">
            Use plain English to explore patterns, insights, and answers from your connected datasets.
          </p>
        </div>
      </div>
    </div>
  )
}
