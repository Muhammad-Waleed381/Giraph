"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileSpreadsheet, Database, FileText } from "lucide-react"

interface DatasetSelectorProps {
  selectedDataset: string | null
  onSelectDataset: (datasetId: string) => void
}

export function DatasetSelector({ selectedDataset, onSelectDataset }: DatasetSelectorProps) {
  // Mock datasets
  const datasets = [
    {
      id: "dataset-1",
      name: "Sales_Q1_2023.xlsx",
      type: "excel",
      icon: <FileSpreadsheet className="h-4 w-4 text-green-600" />,
    },
    {
      id: "dataset-2",
      name: "Customer_Survey.csv",
      type: "csv",
      icon: <FileText className="h-4 w-4 text-blue-600" />,
    },
    {
      id: "dataset-3",
      name: "Product Database",
      type: "database",
      icon: <Database className="h-4 w-4 text-orange-600" />,
    },
  ]

  return (
    <div className="space-y-2">
      <label htmlFor="dataset-select" className="text-sm font-medium text-gray-700">
        Select a Dataset
      </label>
      <Select value={selectedDataset || ""} onValueChange={onSelectDataset}>
        <SelectTrigger id="dataset-select" className="w-full">
          <SelectValue placeholder="Choose a dataset to analyze" />
        </SelectTrigger>
        <SelectContent>
          {datasets.map((dataset) => (
            <SelectItem key={dataset.id} value={dataset.id}>
              <div className="flex items-center gap-2">
                {dataset.icon}
                <span>{dataset.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
