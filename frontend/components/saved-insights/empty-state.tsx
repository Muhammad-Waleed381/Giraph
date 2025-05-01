import { Button } from "@/components/ui/button"
import { Zap } from "lucide-react"
import Link from "next/link"

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
      <div className="mb-4 rounded-full bg-blue-100 p-3">
        <Zap className="h-6 w-6 text-blue-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900">No saved insights yet</h3>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        You haven&apos;t saved any insights yet. Use the AI Insight Generator to create and save insights that matter.
      </p>
      <Link href="/dashboard/insights">
        <Button className="mt-6 bg-teal-600 hover:bg-teal-700">
          <Zap className="mr-2 h-4 w-4" />
          Generate Insights
        </Button>
      </Link>
    </div>
  )
}
