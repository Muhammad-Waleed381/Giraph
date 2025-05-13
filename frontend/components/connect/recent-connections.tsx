"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FileText, BarChart2, Trash2, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface FileSource {
  id: string;
  name: string;
  originalName?: string;
  path?: string;
  size?: number;
  sizeFormatted?: string;
  mimetype?: string;
  fileType?: string;
  uploadedAt?: string;
  format?: string;
  filename?: string;
  importInfo?: {
    status: 'success' | 'failed';
    collectionName: string;
    importedAt: string;
    errorMessage?: string;
  } | null;
}

interface RecentConnectionsProps {
  refreshTrigger?: number; // Changed from key to refreshTrigger
}

export function RecentConnections({ refreshTrigger }: RecentConnectionsProps) {
  const [files, setFiles] = useState<FileSource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{[key: string]: 'success' | 'error' | 'importing' | null}>({});
  const [importMessages, setImportMessages] = useState<{[key: string]: string}>({});
  const { toast } = useToast();

  const fetchUploadedFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Fetching uploaded files...");
      const response = await fetch('/api/datasources/files');
      
      console.log("API Response status:", response.status);
      
      const result = await response.json();
      console.log("API Response data:", result);

      if (!response.ok) {
        throw new Error(result.message || `Error: ${response.status} ${response.statusText}`);
      }

      let uploadedFiles = [];
      if (result.success && result.data?.files) {
        uploadedFiles = result.data.files;
      } else if (result.success && Array.isArray(result.data)) {
        uploadedFiles = result.data;
      } else if (Array.isArray(result)) {
        uploadedFiles = result;
      } else {
        console.warn("Unexpected API response structure:", result);
        uploadedFiles = [];
      }
      
      console.log("Parsed uploaded files:", uploadedFiles);
      setFiles(uploadedFiles);
      
      // Initialize import status based on fetched data
      const initialStatus: {[key: string]: 'success' | 'error' | 'importing' | null} = {};
      const initialMessages: {[key: string]: string} = {};
      uploadedFiles.forEach((file: FileSource) => {
        if (file.importInfo) {
          initialStatus[file.id] = file.importInfo.status;
          if (file.importInfo.status === 'success') {
            initialMessages[file.id] = `Imported to ${file.importInfo.collectionName} on ${format(new Date(file.importInfo.importedAt), "PPp")}`;
          } else if (file.importInfo.status === 'failed') {
            initialMessages[file.id] = `Last import failed: ${file.importInfo.errorMessage || 'Unknown error'}`;
          }
        }
      });
      setImportStatus(initialStatus);
      setImportMessages(initialMessages);
      
    } catch (err: any) {
      console.error("Error fetching uploaded files:", err);
      setError(err.message || "Failed to fetch uploaded files");
      toast({
        title: 'Error Fetching Files',
        description: err.message || "Failed to fetch uploaded files",
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch files on initial load and when refreshTrigger changes (triggered by parent)
  useEffect(() => {
    fetchUploadedFiles();
  }, [fetchUploadedFiles, refreshTrigger]);

  const handleImport = async (file: FileSource) => {
    // Extract file ID from the various possible formats
    const fileId = file.id?.includes(':') ? file.id.split(':')[1] : file.id || file.filename;
    const displayName = file.originalName || file.name || fileId;
    
    if (!fileId) {
      toast({
        title: "Error",
        description: "Missing file identifier for import.",
        variant: "destructive",
      });
      return;
    }

    setImportingId(file.id);
    setImportStatus(prev => ({ ...prev, [file.id]: 'importing' }));
    setImportMessages(prev => ({ ...prev, [file.id]: 'Importing data...' }));
    setError(null);

    try {
      // Display a toast that import has started
      toast({
        title: "Import Started",
        description: `Importing ${displayName}...`,
        className: "bg-blue-100 border border-blue-500 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-100",
      });
      
      const response = await fetch("/api/import/analyze/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: fileId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Import failed");
      }

      // Update import status to success
      setImportStatus(prev => ({ ...prev, [file.id]: 'success' }));
      setImportMessages(prev => ({ ...prev, [file.id]: `Successfully imported to ${result.data?.collectionName || 'database'}` }));
      
      toast({
        title: "Import Successful",
        description: `${displayName} imported into collection: ${result.data?.collectionName || "database"}.`,
        className: "bg-green-100 border border-green-500 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100",
      });

      fetchUploadedFiles(); // Refresh to show updated status from backend
    } catch (err: any) {
      const errorMsg = err.message || "Unknown error during import";
      setImportStatus(prev => ({ ...prev, [file.id]: 'error' }));
      setImportMessages(prev => ({ ...prev, [file.id]: errorMsg }));
      
      setError(`Import failed for ${displayName}: ${errorMsg}`);
      toast({
        title: `Import Failed`,
        description: errorMsg,
        variant: "destructive",
      });
      
      fetchUploadedFiles(); // Refresh to potentially show persistent failure status
    } finally {
      setImportingId(null);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      // Extract just the filename if needed
      const id = fileId.includes(':') ? fileId.split(':')[1] : fileId;
      
      const response = await fetch(`/api/datasources/files/${id}`, { method: 'DELETE' });
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to delete file");
      }
      
      toast({ 
        title: "Success", 
        description: "File deleted successfully.",
        className: "bg-green-100 border border-green-500 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100", 
      });
      
      fetchUploadedFiles(); // Refresh list
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Function to get a simplified display name from the full filename
  const getDisplayName = (file: FileSource): string => {
    // Use originalName if available (from upload)
    if (file.originalName) return file.originalName;
    
    // Otherwise, use name but remove the timestamp that multer adds
    if (file.name) {
      // Remove timestamp pattern like "-1746103444190-58526729" from filenames
      const cleanedName = file.name.replace(/-\d{13}-\d+(?=\.\w+$)/, '');
      return cleanedName;
    }
    
    // If all else fails
    return file.id?.split(':')[1] || 'Unknown File';
  };

  const getFileIcon = (fileType?: string) => {
    return <FileText className="h-5 w-5 text-green-600" />;
  };

  const getFileExtension = (filename?: string) => {
    if (!filename) return "File";
    const ext = filename.split('.').pop()?.toUpperCase();
    return ext || "File";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Uploaded Files</CardTitle>
          <p className="text-sm text-muted-foreground">Your uploaded data files ready for analysis</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUploadedFiles}>
          <Loader2 className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center items-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {error && !isLoading && <p className="text-destructive text-center p-4">{error}</p>}
        {!isLoading && !error && files.length === 0 && (
          <p className="text-muted-foreground text-center p-4">No files uploaded yet.</p>
        )}
        {!isLoading && !error && files.length > 0 && (
          <ul className="space-y-3">
            {files.map((file) => {
              // Determine persistent status from fetched data
              const persistentStatus = file.importInfo?.status;
              const persistentMessage = 
                persistentStatus === 'success' ? `Imported to ${file.importInfo?.collectionName} on ${format(new Date(file.importInfo!.importedAt), "PPp")}`
                : persistentStatus === 'failed' ? `Last import failed: ${file.importInfo?.errorMessage || 'Unknown error'}`
                : null;

              // Determine current display status (prioritize temporary status)
              const displayStatus = importStatus[file.id] === 'importing' ? 'importing' : persistentStatus;
              const displayMessage = importStatus[file.id] === 'importing' ? importMessages[file.id] : persistentMessage;
              
              const isImporting = importingId === file.id || importStatus[file.id] === 'importing';
              const isSuccessfullyImported = persistentStatus === 'success';

              return (
              <li
                key={file.id}
                className="flex flex-col p-3 border rounded-md bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3 overflow-hidden mr-2">
                    {getFileIcon(file.fileType || file.format)}
                    <div className="flex-grow min-w-0">
                      <p className="font-medium truncate">{getDisplayName(file)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {file.fileType || file.format || getFileExtension(file.name)}
                        {file.sizeFormatted && ` • ${file.sizeFormatted}`}
                        {file.uploadedAt && ` • Uploaded on ${format(new Date(file.uploadedAt), "PP")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleImport(file)}
                      disabled={isImporting || isSuccessfullyImported} // Disable if importing OR already imported
                    >
                      {isImporting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : isSuccessfullyImported ? (
                        <CheckCircle className="h-4 w-4 mr-1 text-green-600" /> // Show check if imported
                      ) : (
                        <BarChart2 className="h-4 w-4 mr-1" />
                      )}
                      {isImporting ? "Importing..." 
                       : isSuccessfullyImported ? "Imported" 
                       : "Import"}
                    </Button>
                    <Button
                      variant="ghost" 
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(file.id)}
                      disabled={isImporting} // Only disable delete while actively importing
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
                
                {/* Status message area - Use displayStatus and displayMessage */}
                {displayStatus && displayMessage && (
                  <div className={`
                    mt-1 px-3 py-1.5 text-sm rounded flex items-center gap-2 
                    ${displayStatus === 'success' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                      : displayStatus === 'failed'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' // For 'importing'
                    }
                  `}>
                    {displayStatus === 'success' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : displayStatus === 'failed' ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin" /> // For 'importing'
                    )}
                    <span>{displayMessage}</span>
                  </div>
                )}
              </li>
            )})}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
