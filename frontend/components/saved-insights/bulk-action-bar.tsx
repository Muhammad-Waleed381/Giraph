"use client"

import { Button } from "@/components/ui/button"
import { Download, PlusCircle, Trash2, X } from "lucide-react"

interface BulkActionBarProps {
  selectedCount: number
  onDelete: () => void
  onExport?: () => void
  onAddToDashboard?: () => void
  onClearSelection: () => void
}

export function BulkActionBar({
  selectedCount,
  onDelete,
  onExport,
  onAddToDashboard,
  onClearSelection,
}: BulkActionBarProps) {
  return (
    <div className="sticky top-16 z-10 flex items-center justify-between rounded-lg bg-white p-3 shadow-md">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onClearSelection}>
          <X className="h-4 w-4" />
          <span className="sr-only">Clear selection</span>
        </Button>
        <span className="text-sm font-medium">{selectedCount} items selected</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onExport} className="gap-1">
          <Download className="h-3.5 w-3.5" />
          Export Selected
        </Button>
        <Button variant="outline" size="sm" onClick={onAddToDashboard} className="gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          Add to Dashboard
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Selected
        </Button>
      </div>
    </div>
  )
}
