"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit, ExternalLink, PieChart, BarChart, LineChart, Activity, Loader2, Plus, Layout } from "lucide-react"
import { useDashboards, Dashboard } from "@/lib/hooks/useDashboards"
import { Skeleton } from "@/components/ui/skeleton"

export function RecentDashboards() {
  const { dashboards, loading, error } = useDashboards()

  // Get chart icon based on chart type
  const getChartIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'pie':
        return <PieChart className="h-5 w-5 text-blue-500" />;
      case 'line':
        return <LineChart className="h-5 w-5 text-blue-500" />;
      case 'bar':
        return <BarChart className="h-5 w-5 text-orange-500" />;
      default:
        return <Activity className="h-5 w-5 text-blue-500" />;
    }
  };

  // Format relative time for "last updated"
  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return "Recently";
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      if (diff < 60 * 1000) return "Just now";
      if (diff < 60 * 60 * 1000) {
        const minutes = Math.floor(diff / (60 * 1000));
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
      }
      if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
      }
      
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } catch {
      return "Recently";
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="mb-8">
        <div className="mb-4 flex items-center">
          <h2 className="text-xl font-bold text-white">🧩 Recently Accessed Dashboards</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((index) => (
            <Card key={index} className="overflow-hidden bg-gray-800 border-gray-700">
              <CardHeader className="p-4 pb-0">
                <Skeleton className="h-6 w-3/4 bg-gray-700" />
                <Skeleton className="mt-2 h-4 w-1/2 bg-gray-700" />
              </CardHeader>
              <CardContent className="p-4">
                <Skeleton className="h-32 w-full bg-gray-700" />
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t border-gray-700 p-4 pt-3">
                <Skeleton className="h-4 w-1/4 bg-gray-700" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-16 bg-gray-700" />
                  <Skeleton className="h-8 w-16 bg-gray-700" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mb-8">
        <div className="mb-4 flex items-center">
          <h2 className="text-xl font-bold text-white">🧩 Recently Accessed Dashboards</h2>
        </div>
        <Card className="bg-gray-800 border-gray-700 text-center p-6">
          <p className="text-red-400">Error loading dashboards. Please try again later.</p>
        </Card>
      </div>
    );
  }

  // Empty state - showing suggested dashboards now instead of just an empty message
  if (dashboards.length === 0) {
    const suggestedDashboards = [
      {
        title: "Sales Performance",
        description: "Track revenue, growth, and sales metrics",
        icon: <BarChart className="h-12 w-12 text-blue-500" />,
      },
      {
        title: "Customer Analytics",
        description: "Understand customer behavior and demographics",
        icon: <PieChart className="h-12 w-12 text-orange-500" />,
      },
      {
        title: "Marketing Dashboard",
        description: "Monitor campaign performance and ROI",
        icon: <LineChart className="h-12 w-12 text-green-500" />,
      }
    ];

    return (
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">🧩 Dashboards</h2>
          <Link href="/dashboard/visualizations/create">
            <Button className="bg-blue-700 hover:bg-blue-600">
              <Plus className="mr-1 h-4 w-4" /> Create Dashboard
            </Button>
          </Link>
        </div>
        
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-blue-400">No dashboards yet</CardTitle>
            <CardDescription className="text-gray-400">
              Create your first dashboard to visualize your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-6">
              <Layout className="h-24 w-24 text-gray-700" />
            </div>
          </CardContent>
          <CardFooter className="border-t border-gray-700 flex justify-center">
            <Link href="/dashboard/visualizations/create">
              <Button className="bg-blue-700 hover:bg-blue-600">Get Started with Dashboards</Button>
            </Link>
          </CardFooter>
        </Card>
        
        <h3 className="text-lg font-medium text-white mb-4">Suggested Dashboard Templates</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {suggestedDashboards.map((dashboard, index) => (
            <Card key={index} className="bg-gray-800 border-gray-700 hover:border-blue-600 cursor-pointer transition-all">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="rounded-full bg-blue-900/30 p-4 mb-4">
                    {dashboard.icon}
                  </div>
                  <h4 className="text-white font-medium mb-2">{dashboard.title}</h4>
                  <p className="text-gray-400 text-sm">{dashboard.description}</p>
                </div>
              </CardContent>
              <CardFooter className="border-t border-gray-700 flex justify-center">
                <Link href={`/dashboard/visualizations/create?template=${dashboard.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  <Button variant="ghost" className="text-blue-400 hover:text-blue-300">
                    Use Template
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">🧩 Recently Accessed Dashboards</h2>
        <Link href="/dashboard/visualizations/create">
          <Button className="bg-blue-700 hover:bg-blue-600">
            <Plus className="mr-1 h-4 w-4" /> New Dashboard
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {dashboards.slice(0, 3).map((dashboard) => (
          <Card key={dashboard.id} className="overflow-hidden bg-gray-800 border-gray-700">
            <CardHeader className="p-4 pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getChartIcon(dashboard.type)}
                  <CardTitle className="text-base text-white">{dashboard.title}</CardTitle>
                </div>
              </div>
              <CardDescription className="mt-1 text-xs text-gray-400">
                {dashboard.description || "No description"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-32 rounded-md bg-gray-900 flex items-center justify-center">
                {/* Add real chart preview if available */}
                <img
                  src="/placeholder.svg?height=128&width=256"
                  alt="Dashboard preview"
                  className="h-full w-full object-cover"
                />
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between border-t border-gray-700 p-4 pt-3">
              <span className="text-xs text-gray-400">
                Updated {formatRelativeTime(dashboard.lastUpdated)}
              </span>
              <div className="flex gap-2">
                <Link href={`/dashboard/visualizations/edit/${dashboard.id}`}>
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-700">
                    <Edit className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                </Link>
                <Link href={`/dashboard/visualizations/${dashboard.id}`}>
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-700">
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Open
                  </Button>
                </Link>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      {dashboards.length > 3 && (
        <div className="mt-4 text-center">
          <Link href="/dashboard/visualizations">
            <Button variant="outline" className="text-blue-400 border-blue-500 hover:bg-blue-900/30">
              View All Dashboards
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
