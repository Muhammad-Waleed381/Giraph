import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';

export interface UploadedFile {
  id: string;
  name: string;
  originalName: string;
  size?: number;
  mimeType?: string;
  uploadDate: string;
  type?: string;
  path?: string;
}

export function useUploadedFiles() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFiles() {
      try {
        setLoading(true);
        const response = await apiClient.get('/datasources/files');
        
        if (response.data && response.data.data) {
          // Backend returns files in data property
          const filesData = Array.isArray(response.data.data) ? response.data.data : [];
          
          // Map the files to our expected format
          const formattedFiles = filesData.map((file: any) => ({
            id: file.id || `file-${file.name}`,
            name: file.name,
            originalName: file.originalName || file.name,
            size: file.size,
            mimeType: file.mimetype || file.fileType,
            uploadDate: file.uploadedAt,
            type: file.fileType || 'unknown',
            path: file.path
          }));
          
          setFiles(formattedFiles);
        } else {
          // Handle unexpected response format
          console.warn('Unexpected API response format:', response.data);
          setFiles([]);
        }
        setError(null);
      } catch (err: any) {
        console.error('Error fetching uploaded files:', err);
        setError(err.message || 'Failed to fetch uploaded files');
        setFiles([]);
      } finally {
        setLoading(false);
      }
    }

    fetchFiles();
  }, []);

  return { files, loading, error };
} 