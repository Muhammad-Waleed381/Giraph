"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUpload } from "@/components/connect/file-upload"
import { CloudServices } from "@/components/connect/cloud-services"
import { DatabaseConnections } from "@/components/connect/database-connections"
import { DataPreview } from "@/components/connect/data-preview"
import { FileText, Cloud, Database } from "lucide-react"

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)

  const handleFileSelected = (file: File) => {
    setSelectedFile(file)

    // Simulate data preview
    setTimeout(() => {
      const mockPreviewData = {
        columns: ["ID", "Name", "Email", "Date", "Amount"],
        rows: [
          { ID: "1", Name: "John Doe", Email: "john@example.com", Date: "2023-01-15", Amount: "$120.50" },
          { ID: "2", Name: "Jane Smith", Email: "jane@example.com", Date: "2023-01-16", Amount: "$75.20" },
          { ID: "3", Name: "Bob Johnson", Email: "bob@example.com", Date: "2023-01-17", Amount: "$220.00" },
          { ID: "4", Name: "Alice Brown", Email: "alice@example.com", Date: "2023-01-18", Amount: "$45.75" },
        ],
        totalRows: 1250,
      }
      setPreviewData(mockPreviewData)
      setShowPreview(true)
    }, 1000)
  }

  const handleCloudFileSelected = (filename: string) => {
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

  const handleDatabaseConnected = () => {
    // Simulate data preview for database
    setTimeout(() => {
      const mockPreviewData = {
        columns: ["OrderID", "CustomerID", "OrderDate", "ShipDate", "Status"],
        rows: [
          {
            OrderID: "10001",
            CustomerID: "C5782",
            OrderDate: "2023-04-10",
            ShipDate: "2023-04-12",
            Status: "Delivered",
          },
          { OrderID: "10002", CustomerID: "C8912", OrderDate: "2023-04-11", ShipDate: "2023-04-13", Status: "Shipped" },
          {
            OrderID: "10003",
            CustomerID: "C3451",
            OrderDate: "2023-04-12",
            ShipDate: "2023-04-14",
            Status: "Processing",
          },
          { OrderID: "10004", CustomerID: "C7623", OrderDate: "2023-04-13", ShipDate: "2023-04-15", Status: "Pending" },
        ],
        totalRows: 2150,
      }
      setPreviewData(mockPreviewData)
      setShowPreview(true)
    }, 1000)
  }

  return (
    <div className="mb-8">
      <Tabs defaultValue="file" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="file" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>📁 File Upload</span>
          </TabsTrigger>
          <TabsTrigger value="cloud" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            <span>☁️ Cloud Services</span>
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>🧬 Database/API</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="file">
          <FileUpload onFileSelected={handleFileSelected} onUploadSuccess={onUploadSuccess} />
        </TabsContent>
        <TabsContent value="cloud">
          <CloudServices onFileSelected={handleCloudFileSelected} />
        </TabsContent>
        <TabsContent value="database">
          <DatabaseConnections onConnected={handleDatabaseConnected} />
        </TabsContent>
      </Tabs>

      {showPreview && previewData && <DataPreview data={previewData} />}
    </div>
  )
}
