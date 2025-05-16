"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { HomeIcon, ChevronRight, ArrowLeft, Loader2, Share2, Clock, DownloadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/components/ui/use-toast"
import visualizationService from "@/lib/visualizationService"
import { GeneratedDashboardView } from "@/components/visualizations/generated-dashboard-view"
import { Separator } from "@/components/ui/separator"

export default function DashboardPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const [dashboard, setDashboard] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Load dashboard data
  useEffect(() => {
    const fetchDashboard = async () => {
      if (!params.id) return
      
      try {
        setIsLoading(true)
        const dashboardData = await visualizationService.getDashboardById(params.id as string)
        setDashboard(dashboardData)
      } catch (err) {
        console.error("Failed to load dashboard:", err)
        setError("Failed to load dashboard. It may not exist or you don't have access.")
        toast({
          title: "Error",
          description: "Could not load dashboard. Please try again.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchDashboard()
  }, [params.id, toast])
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch (e) {
      return "Unknown date"
    }
  }
  
  if (isLoading) {
    return (
      <main className="flex-1 p-6 md:p-8">
        <div className="flex justify-center items-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="font-medium text-lg mb-1">Loading Dashboard</h3>
            <p className="text-muted-foreground">Please wait while we load your dashboard...</p>
          </div>
        </div>
      </main>
    )
  }
  
  if (error || !dashboard) {
    return (
      <main className="flex-1 p-6 md:p-8">
        <div className="flex justify-center items-center h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <h3 className="font-medium text-lg mb-4">Dashboard Not Found</h3>
              <p className="text-muted-foreground mb-6">
                {error || "The dashboard you're looking for doesn't exist or you don't have access."}
              </p>
              <Button onClick={() => router.push("/visualizations")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Visualizations
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }
  
  return (
    <main className="flex-1 p-6 md:p-8">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">
              <HomeIcon className="mr-1 h-3 w-3" />
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink href="/visualizations">
              Visualizations
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink>
              {dashboard.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">{dashboard.name}</h1>
          {dashboard.description && (
            <p className="text-muted-foreground">{dashboard.description}</p>
          )}
          <div className="flex items-center mt-2 space-x-3">
            <Badge variant="outline">Collection: {dashboard.collectionName}</Badge>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5 mr-1" />
              Updated {formatDate(dashboard.updatedAt)}
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <DownloadCloud className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      <Separator className="mb-6" />
      
      <GeneratedDashboardView 
        visualizations={dashboard.visualizations} 
        collectionName={dashboard.collectionName} 
      />
    </main>
  )
} 