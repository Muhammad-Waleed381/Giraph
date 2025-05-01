"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileSpreadsheet, FileText, FileJson, Upload, X, Check } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface FileUploadProps {
  onFileSelected: (file: File) => void
}

export function FileUpload({ onFileSelected }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [datasetName, setDatasetName] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    setSelectedFile(file)
    setDatasetName(file.name.split(".")[0])
    simulateUpload(file)
  }

  const simulateUpload = (file: File) => {
    setUploading(true)
    setUploadProgress(0)

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setUploadComplete(true)
          setUploading(false)
          onFileSelected(file)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const resetUpload = () => {
    setSelectedFile(null)
    setDatasetName("")
    setUploadProgress(0)
    setUploadComplete(false)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  const fileTypes = [
    { name: "CSV", icon: <FileText className="h-10 w-10 text-blue-500" /> },
    { name: "Excel", icon: <FileSpreadsheet className="h-10 w-10 text-green-500" /> },
    { name: "JSON", icon: <FileJson className="h-10 w-10 text-orange-500" /> },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {fileTypes.map((type) => (
          <Card key={type.name} className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-lg">{type.name}</CardTitle>
                <CardDescription>Upload {type.name} files</CardDescription>
              </div>
              {type.icon}
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className={`border-2 ${dragActive ? "border-teal-500 bg-teal-50" : "border-dashed"}`}>
        <CardContent className="pt-6">
          {!selectedFile ? (
            <div
              className="flex flex-col items-center justify-center py-10"
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="mb-4 rounded-full bg-teal-100 p-3">
                <Upload className="h-6 w-6 text-teal-600" />
              </div>
              <p className="mb-2 text-center text-lg font-medium">Drag and drop your file here</p>
              <p className="mb-4 text-center text-sm text-gray-500">
                Supports CSV, Excel (.xlsx), and JSON files up to 50MB
              </p>
              <Button onClick={() => inputRef.current?.click()} className="bg-teal-600 hover:bg-teal-700">
                Browse Files
              </Button>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls,.json"
                onChange={handleChange}
              />
              <p className="mt-4 text-center text-xs text-gray-400">🔒 Your data is encrypted and securely stored</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedFile.name.endsWith(".csv") && <FileText className="h-8 w-8 text-blue-500" />}
                  {(selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls")) && (
                    <FileSpreadsheet className="h-8 w-8 text-green-500" />
                  )}
                  {selectedFile.name.endsWith(".json") && <FileJson className="h-8 w-8 text-orange-500" />}
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={resetUpload}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Uploading...</span>
                    <span className="text-xs font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {uploadComplete && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span>Upload complete</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="dataset-name">Dataset Name</Label>
                <Input
                  id="dataset-name"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="Enter a name for this dataset"
                />
              </div>
            </div>
          )}
        </CardContent>
        {selectedFile && uploadComplete && (
          <CardFooter className="justify-end border-t px-6 py-4">
            <Button className="bg-teal-600 hover:bg-teal-700">Continue to Analysis</Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
