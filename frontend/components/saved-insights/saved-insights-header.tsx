import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function SavedInsightsHeader() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
          <span className="text-xl text-blue-600">💾</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">Saved Insights</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-gray-400 hover:text-gray-600">
                    <HelpCircle className="h-5 w-5" />
                    <span className="sr-only">Learn more about saved insights</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-sm">
                  <p>
                    Your collection of curated insights, always accessible for quick decision-making or future
                    reference.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-gray-600">
            Your collection of curated insights, always accessible for quick decision-making or future reference.
          </p>
        </div>
      </div>
    </div>
  )
}
