"use client"
import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Database, Loader2 } from "lucide-react"
// Import apiClient for more consistent API calls
import apiClient from "@/lib/apiClient"
import { useTheme } from 'next-themes'

interface CollectionSelectorProps {
  selectedCollection: string | null
  onSelectCollection: (collectionName: string) => void
  disabled?: boolean
}

interface Collection {
  id: string;
  name: string;
  // Add other relevant properties if needed, e.g., icon based on source type
}

export function DatasetSelector({ selectedCollection, onSelectCollection, disabled }: CollectionSelectorProps) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    const fetchCollections = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Use our API route which uses apiClient with withCredentials: true
        const response = await fetch("/api/datasources/collections", {
          credentials: 'include' // Ensure cookies are sent with the request
        });
        
        console.log("Collections API response status:", response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Collections API error:", errorData);
          throw new Error(errorData.message || `Failed to fetch collections: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log("Collections API result:", result);
        
        if (result.success && Array.isArray(result.data)) {
          const fetchedCollections = result.data.map((name: string) => ({ 
            id: name, // Use collection name as ID if it's unique
            name: name 
          })); 
          setCollections(fetchedCollections);
        } else {
          throw new Error(result.message || "Invalid data format for collections");
        }
      } catch (err: any) {
        console.error("Error fetching collections:", err);
        setError(err.message || "Could not load collections. Please try again.");
        setCollections([]); // Clear collections on error
      } finally {
        setIsLoading(false)
      }
    }

    fetchCollections()
  }, [])

  return (
    <div className="space-y-2">
      <label htmlFor="collection-select" className="text-sm font-medium">
        Select a Collection
      </label>
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading collections...</span>
        </div>
      ) : error ? (
        <div className="text-destructive text-sm">{error}</div>
      ) : collections.length === 0 ? (
        <div className="text-muted-foreground text-sm">
          No collections available. Please ensure there is data in the database.
        </div>
      ) : (
        <Select 
          value={selectedCollection || ""} 
          onValueChange={onSelectCollection} 
          disabled={disabled || isLoading}
        >
          <SelectTrigger id="collection-select" className="w-full">
            <SelectValue placeholder="Choose a collection to ask questions about" />
          </SelectTrigger>
          <SelectContent>
            {collections.map((collection) => (
              <SelectItem key={collection.id} value={collection.id}>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span>{collection.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
