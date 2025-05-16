"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileSpreadsheet, FileText, BarChart, RefreshCw, Database, FileQuestion, Loader2 } from "lucide-react"
import { useUploadedFiles, UploadedFile } from "@/lib/hooks/useUploadedFiles"
import { useCollections, Collection } from "@/lib/hooks/useCollections"
import { Skeleton } from "@/components/ui/skeleton"
import { useState } from "react"

export function RecentDataSources() {
  const { files, loading: filesLoading, error: filesError } = useUploadedFiles()
  const { collections, loading: collectionsLoading, error: collectionsError } = useCollections()
  const [showCollections, setShowCollections] = useState(false)
  
  const loading = filesLoading || collectionsLoading
  const error = filesError || collectionsError

  // Determine the file icon based on type
  const getFileIcon = (file: UploadedFile) => {
    const type = file.mimeType?.toLowerCase() || file.name.split('.').pop()?.toLowerCase();
    
    if (type?.includes('excel') || type?.includes('spreadsheet') || type === 'xlsx' || type === 'xls') {
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    } else if (type?.includes('csv') || type === 'csv') {
      return <FileText className="h-5 w-5 text-blue-500" />;
    } else if (type?.includes('json') || type === 'json') {
      return <Database className="h-5 w-5 text-yellow-500" />;
    } else {
      return <FileQuestion className="h-5 w-5 text-gray-500" />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return "Unknown date";
    }
  };

  // Calculate file size in appropriate units
  const formatFileSize = (bytes?: number) => {
    if (bytes === undefined) return "Unknown size";
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="mb-8">
        <div className="mb-4 flex items-center">
          <h2 className="text-xl font-bold text-white">📁 Your data sources</h2>
        </div>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-0">
            <div className="space-y-0">
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="flex items-center justify-between p-4 border-b border-gray-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded-full bg-gray-700" />
                    <div>
                      <Skeleton className="h-5 w-40 bg-gray-700" />
                      <Skeleton className="mt-1 h-3 w-24 bg-gray-700" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-16 bg-gray-700" />
                    <Skeleton className="h-8 w-16 bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mb-8">
        <div className="mb-4 flex items-center">
          <h2 className="text-xl font-bold text-white">📁 Your data sources</h2>
        </div>
        <Card className="bg-gray-800 border-gray-700 text-center p-6">
          <p className="text-red-400">Error loading data sources. Please try again later.</p>
        </Card>
      </div>
    );
  }

  // Empty state
  const hasFiles = files.length > 0;
  const hasCollections = collections.length > 0;

  if (!hasFiles && !hasCollections) {
    return (
      <div className="mb-8">
        <div className="mb-4 flex items-center">
          <h2 className="text-xl font-bold text-white">📁 Your data sources</h2>
        </div>
        <Card className="bg-gray-800 border-gray-700 text-center p-6">
          <p className="text-gray-400 mb-4">You haven't uploaded any data files yet.</p>
          <Link href="/dashboard/connect">
            <Button className="bg-blue-700 hover:bg-blue-600">Upload Your First Dataset</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">📁 Your data sources</h2>
        {hasFiles && hasCollections && (
          <div className="flex space-x-2">
            <Button 
              variant={showCollections ? "secondary" : "outline"} 
              size="sm"
              onClick={() => setShowCollections(true)}
              className={!showCollections ? "text-blue-400 border-blue-500" : ""}
            >
              Collections
            </Button>
            <Button 
              variant={!showCollections ? "secondary" : "outline"} 
              size="sm"
              onClick={() => setShowCollections(false)}
              className={showCollections ? "text-blue-400 border-blue-500" : ""}
            >
              Files
            </Button>
          </div>
        )}
      </div>
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-0">
          <div className="space-y-0">
            {showCollections && hasCollections ? (
              // Show collections
              collections.slice(0, 4).map((collection) => (
                <div key={collection.id} className="flex items-center justify-between p-4 border-b border-gray-700 last:border-0 hover:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-white">{collection.name}</p>
                      <p className="text-xs text-gray-400">
                        {collection.recordCount || 0} records
                        {collection.lastUpdated && ` • Updated ${formatDate(collection.lastUpdated)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/dashboard/ask?collection=${collection.name}`}>
                      <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-700">
                        <BarChart className="mr-1 h-3.5 w-3.5" />
                        Analyze
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            ) : hasFiles ? (
              // Show files
              files.slice(0, 4).map((file) => (
                <div key={file.id} className="flex items-center justify-between p-4 border-b border-gray-700 last:border-0 hover:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file)}
                    <div>
                      <p className="text-sm font-medium text-white">{file.originalName || file.name}</p>
                      <p className="text-xs text-gray-400">
                        {file.type?.toUpperCase() || 'FILE'} • {formatFileSize(file.size)} 
                        • Uploaded on {formatDate(file.uploadDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/dashboard/ask?file=${file.id}`}>
                      <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-700">
                        <BarChart className="mr-1 h-3.5 w-3.5" />
                        Analyze
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="text-red-300 hover:text-red-100 hover:bg-red-900/30">
                      <RefreshCw className="mr-1 h-3.5 w-3.5" />
                      Re-upload
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              // Shouldn't reach here due to earlier empty state
              <div className="p-4 text-center text-gray-400">No data sources available</div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="mt-4 text-center">
        <Link href={showCollections ? "/dashboard/ask" : "/dashboard/connect"}>
          <Button variant="outline" className="text-blue-400 border-blue-500 hover:bg-blue-900/30">
            {showCollections ? "View All Collections" : "View All Files"}
          </Button>
        </Link>
      </div>
    </div>
  )
}
