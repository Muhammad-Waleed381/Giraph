"use client"

import React, { useState, useCallback } from "react"
import { UploadCloud, File as FileIcon, Loader2, X } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"

interface FileInfo {
  fileId: string
  originalName: string
  path: string
  size: number
  mimeType: string
}

interface FileUploadProps {
  onUploadSuccess: (fileInfo: FileInfo) => void
}

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
      setError(null)
      setUploadProgress(0)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/json": [".json"],
      "text/json": [".json"]
    },
    multiple: false,
  } as any)

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file first.")
      return
    }

    setIsLoading(true)
    setError(null) // Clear error at the start of upload attempt
    setUploadProgress(0)

    const formData = new FormData()
    formData.append("file", selectedFile)

    let response: Response | null = null
    let result: any = null

    try {
      // Simulate upload progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = Math.min(prev + Math.random() * 10, 90)
          return newProgress
        })
      }, 300)

      response = await fetch("/api/datasources/files", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(95)

      result = await response.json()

      if (!response.ok) {
        // Specific handling for 409 Conflict (duplicate file)
        if (response.status === 409) {
          const errorMsg = result.message || "A file with the same name already exists."
          setError(errorMsg)
          toast({
            title: "Duplicate File",
            description: errorMsg,
            variant: "destructive",
          })
        } else {
          // Handle other error types
          const errorMsg = result.message || `Upload failed with status: ${response.status}`
          setError(errorMsg)
          toast({
            title: "Upload Failed",
            description: errorMsg,
            variant: "destructive",
          })
        }
        return
      }

      // Upload complete
      setUploadProgress(100)

      // Check for success flag and that data object with a string id or filename exists.
      if (result.success === true && result.data && (typeof result.data.id === 'string' || typeof result.data.filename === 'string')) {
        const filename = result.data.originalName || result.data.filename || result.data.id || 'File';
        toast({
          title: "Upload Successful",
          description: `${filename} uploaded successfully.`,
          variant: "default",
          className: "bg-green-100 border border-green-500 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100",
        })
        setSelectedFile(null) // Clear selection after successful upload
        setError(null) // Explicitly clear any previous error on success
        onUploadSuccess(result.data) // Pass fileInfo (which is result.data) to parent
      } else {
        // Handle cases where response is ok but backend indicates failure
        const errorMsg = result.message || "Upload failed. Invalid response from server."
        setError(errorMsg)
        toast({
          title: "Upload Failed",
          description: errorMsg,
          variant: "destructive",
        })
      }
    } catch (err: any) {
      console.error("Upload failed:", err)
      const errorMsg = err.message || "An unexpected error occurred during upload."
      setError(errorMsg)
      toast({
        title: "Upload Failed",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      // Leave progress at 100 briefly if successful before resetting
      if (response?.ok) {
        setTimeout(() => setUploadProgress(0), 1000)
      } else {
        setUploadProgress(0)
      }
    }
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setError(null)
    setUploadProgress(0)
  }

  return (
    <div className="p-6 border rounded-lg shadow-sm bg-card text-card-foreground">
      <h3 className="text-lg font-semibold mb-4">Upload Files</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Upload CSV, XLS, XLSX, or JSON files to start analyzing your data.
      </p>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ease-in-out
          ${isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}
          ${error ? "border-destructive" : ""}`}
      >
        <input {...getInputProps() as any} />
        <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        {isDragActive ? (
          <p className="text-primary">Drop the file here ...</p>
        ) : (
          <p className="text-muted-foreground">Drag & drop a file here, or click to select a file</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">Supported formats: CSV, XLS, XLSX, JSON</p>
      </div>

      {selectedFile && !isLoading && (
        <div className="mt-4 p-3 border rounded-md flex items-center justify-between bg-muted/50">
          <div className="flex items-center gap-2">
            <FileIcon className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">{selectedFile.name}</span>
            <span className="text-xs text-muted-foreground">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
          </div>
          <Button variant="ghost" size="icon" onClick={clearSelection} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="mt-4">
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-sm text-center mt-2 text-muted-foreground">Uploading {selectedFile?.name}...</p>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-destructive text-center">{error}</p>}

      <Button onClick={handleUpload} disabled={!selectedFile || isLoading} className="w-full mt-6">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          "Upload and Analyze"
        )}
      </Button>
    </div>
  )
}
