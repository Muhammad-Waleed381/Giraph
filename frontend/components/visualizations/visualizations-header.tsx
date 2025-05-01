"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreateVisualizationModal } from "@/components/visualizations/create-visualization-modal"

export function VisualizationsHeader() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-6">
        <div className="flex flex-1 items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Visualizations</h1>
            <p className="text-sm text-muted-foreground">Create and manage your data visualizations and dashboards</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Visualization
          </Button>
        </div>
      </div>
      <CreateVisualizationModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
    </div>
  )
}
