"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUpload } from "@/components/connect/file-upload"
import { CloudServices } from "@/components/connect/cloud-services"
import { FileText, Cloud } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

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
  const router = useRouter()
  const { toast } = useToast()

  const handleGoogleSheetSelected = (filename: string, dataSourceId?: string, type?: 'google_sheet') => {
    // Don't redirect - just stay on the current page
    console.log(`Google Sheet imported successfully: ${filename}${dataSourceId ? ` (ID: ${dataSourceId})` : ''}`)
    
    // Optional: Show a success toast if not already shown by the caller
    // toast({
    //   title: "Import Successful",
    //   description: `${filename} imported successfully.`,
    // })
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
    </div>
  )
}
