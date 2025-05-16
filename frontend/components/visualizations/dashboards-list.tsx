"use client"

import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { LayoutDashboard, ExternalLink, MoreHorizontal, AlertCircle, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import visualizationService, { Dashboard } from "@/lib/visualizationService"
import Link from "next/link"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

export function DashboardsList() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { toast } = useToast()
  
  // Load dashboards on component mount
  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const dashboardsData = await visualizationService.getAllDashboards()
        setDashboards(dashboardsData)
      } catch (err) {
        console.error("Failed to load dashboards:", err)
        setError("Failed to load dashboards. Please try again.")
        toast({
          title: "Error",
          description: "Could not load dashboards. Please try again.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchDashboards()
  }, [toast])
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch (e) {
      return "Unknown date"
    }
  }
  
  // Render loading skeletons
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-full" />
            </CardHeader>
            <CardContent className="pb-0">
              <Skeleton className="h-[120px] w-full rounded-md" />
            </CardContent>
            <CardFooter className="pt-4">
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-3 w-1/4 ml-auto" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }
  
  // Show error message
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  
  // Show empty state
  if (dashboards.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <LayoutDashboard className="h-12 w-12 mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No dashboards yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first dashboard to visualize your data.
          </p>
          <Link href="/visualizations/create">
            <Button>Create Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {dashboards.map((dashboard) => (
        <Card key={dashboard._id} className="overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="line-clamp-1">{dashboard.name}</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/visualizations/dashboard/${dashboard._id}`}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CardDescription className="line-clamp-2">
              {dashboard.description || "No description provided"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex-grow p-4">
            <div className="bg-muted/50 rounded-md h-[120px] flex items-center justify-center">
              <div className="text-center">
                <Badge variant="outline" className="mb-2">
                  {dashboard.visualizationsCount} visualization{dashboard.visualizationsCount !== 1 ? 's' : ''}
                </Badge>
                <div className="flex items-center justify-center text-muted-foreground">
                  <Database className="h-4 w-4 mr-1" />
                  <span className="text-xs">{dashboard.collectionName}</span>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="pt-3 border-t flex justify-between">
            <div className="text-xs text-muted-foreground">
              Created {formatDate(dashboard.createdAt)}
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/visualizations/dashboard/${dashboard._id}`}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Open
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
} 