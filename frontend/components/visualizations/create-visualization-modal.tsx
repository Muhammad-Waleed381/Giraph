"use client"

import type React from "react"

import { useState } from "react"
import { BarChart4, LineChart, PieChart, Table2, GanttChart, ScatterChart, Map } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface CreateVisualizationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const visualizationTypes = [
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Create a multi-chart dashboard",
    icon: BarChart4,
  },
  {
    id: "chart",
    name: "Single Chart",
    description: "Create an individual chart",
    icon: LineChart,
  },
  {
    id: "report",
    name: "Report",
    description: "Create a detailed data report",
    icon: Table2,
  },
]

export function CreateVisualizationModal({ open, onOpenChange }: CreateVisualizationModalProps) {
  const [visualizationType, setVisualizationType] = useState("dashboard")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Create New Visualization</SheetTitle>
          <SheetDescription>Create a new visualization or dashboard to analyze your data</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="visualization-type">Visualization Type</Label>
              <RadioGroup
                id="visualization-type"
                value={visualizationType}
                onValueChange={setVisualizationType}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2"
              >
                {visualizationTypes.map((type) => (
                  <div key={type.id} className="relative">
                    <RadioGroupItem value={type.id} id={type.id} className="peer sr-only" />
                    <Label
                      htmlFor={type.id}
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <type.icon className="mb-3 h-6 w-6" />
                      <div className="text-center">
                        <div className="font-medium">{type.name}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Enter visualization title" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Enter a brief description" rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataset">Data Source</Label>
              <Select>
                <SelectTrigger id="dataset">
                  <SelectValue placeholder="Select a data source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales-data">Sales Data 2023</SelectItem>
                  <SelectItem value="customer-data">Customer Database</SelectItem>
                  <SelectItem value="marketing-data">Marketing Analytics</SelectItem>
                  <SelectItem value="product-data">Product Database</SelectItem>
                  <SelectItem value="financial-data">Financial Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {visualizationType === "dashboard" && (
              <div className="space-y-2">
                <Label>Select Chart Types</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Button type="button" variant="outline" className="flex flex-col h-auto py-3">
                    <BarChart4 className="h-5 w-5 mb-1" />
                    <span className="text-xs">Bar</span>
                  </Button>
                  <Button type="button" variant="outline" className="flex flex-col h-auto py-3">
                    <LineChart className="h-5 w-5 mb-1" />
                    <span className="text-xs">Line</span>
                  </Button>
                  <Button type="button" variant="outline" className="flex flex-col h-auto py-3">
                    <PieChart className="h-5 w-5 mb-1" />
                    <span className="text-xs">Pie</span>
                  </Button>
                  <Button type="button" variant="outline" className="flex flex-col h-auto py-3">
                    <ScatterChart className="h-5 w-5 mb-1" />
                    <span className="text-xs">Scatter</span>
                  </Button>
                  <Button type="button" variant="outline" className="flex flex-col h-auto py-3">
                    <Table2 className="h-5 w-5 mb-1" />
                    <span className="text-xs">Table</span>
                  </Button>
                  <Button type="button" variant="outline" className="flex flex-col h-auto py-3">
                    <GanttChart className="h-5 w-5 mb-1" />
                    <span className="text-xs">Gantt</span>
                  </Button>
                  <Button type="button" variant="outline" className="flex flex-col h-auto py-3">
                    <Map className="h-5 w-5 mb-1" />
                    <span className="text-xs">Map</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
          <SheetFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
