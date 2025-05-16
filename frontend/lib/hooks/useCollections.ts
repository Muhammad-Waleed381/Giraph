import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';

export interface Collection {
  id: string;
  name: string;
  description?: string;
  recordCount?: number;
  lastUpdated?: string;
  type?: string;
}

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCollections() {
      try {
        setLoading(true);
        const response = await apiClient.get('/datasources/collections');
        
        if (response.data && response.data.data) {
          // The backend returns collections directly in the data array, not in a nested 'collections' property
          const collectionsData = Array.isArray(response.data.data) ? response.data.data : [];
          
          // Map the collections to our expected format
          const formattedCollections = collectionsData.map((name: string) => ({
            id: `collection-${name}`,
            name,
            description: `Collection ${name}`,
            recordCount: 0 // We don't have this information from the API
          }));
          
          setCollections(formattedCollections);
        } else {
          // Handle unexpected response format
          console.warn('Unexpected API response format:', response.data);
          setCollections([]);
        }
        setError(null);
      } catch (err: any) {
        console.error('Error fetching collections:', err);
        setError(err.message || 'Failed to fetch collections');
        setCollections([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCollections();
  }, []);

  return { collections, loading, error };
} 