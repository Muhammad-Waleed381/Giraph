import { BarChart4, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-240px)] text-center p-8">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <BarChart4 className="h-10 w-10 text-primary" />
      </div>
      <h3 className="text-2xl font-semibold mb-2">No visualizations yet</h3>
      <p className="text-muted-foreground max-w-md mb-6">
        Create your first visualization dashboard to gain insights from your data. You can create charts, graphs, and
        interactive dashboards.
      </p>
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        Create Visualization
      </Button>
    </div>
  )
}
