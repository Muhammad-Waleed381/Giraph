"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUpload } from "@/components/connect/file-upload"
import { CloudServices } from "@/components/connect/cloud-services"
import { DataPreview } from "@/components/connect/data-preview"
import { FileText, Cloud } from "lucide-react"

// Define FileInfo structure
interface FileInfo {
  fileId: string
  originalName: string
  path: string
  size: number
  mimeType: string
}

// Accept the callback prop
interface ConnectTabsProps {
  onUploadSuccess: (fileInfo: FileInfo) => void
}

export function ConnectTabs({ onUploadSuccess }: ConnectTabsProps) {
  const [previewData, setPreviewData] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)

  const handleGoogleSheetSelected = (filename: string) => {
    // Simulate data preview for cloud files
    setTimeout(() => {
      const mockPreviewData = {
        columns: ["Product", "Category", "Price", "Stock", "Rating"],
        rows: [
          { Product: "Laptop", Category: "Electronics", Price: "$999.99", Stock: "15", Rating: "4.5" },
          { Product: "Headphones", Category: "Electronics", Price: "$89.99", Stock: "42", Rating: "4.2" },
          { Product: "Desk Chair", Category: "Furniture", Price: "$199.99", Stock: "8", Rating: "4.0" },
          { Product: "Coffee Maker", Category: "Appliances", Price: "$49.99", Stock: "23", Rating: "4.7" },
        ],
        totalRows: 850,
      }
      setPreviewData(mockPreviewData)
      setShowPreview(true)
    }, 1000)
  }

  return (
    <div className="mb-8">
      <Tabs defaultValue="file" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="file">
            <FileText className="w-5 h-5 mr-2" />
            File Upload
          </TabsTrigger>
          <TabsTrigger value="cloud">
            <Cloud className="w-5 h-5 mr-2" />
            Google Sheets
          </TabsTrigger>
        </TabsList>
        <TabsContent value="file">
          <FileUpload onUploadSuccess={onUploadSuccess} />
        </TabsContent>
        <TabsContent value="cloud">
          <CloudServices onFileSelected={handleGoogleSheetSelected} />
        </TabsContent>
      </Tabs>
      {showPreview && <DataPreview data={previewData} />}
    </div>
  )
}
