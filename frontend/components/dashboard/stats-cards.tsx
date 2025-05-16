"use client"

import { useState, useEffect } from "react"
import { Database, BarChart3, Clock, LineChart } from "lucide-react"
import { useCollections } from "@/lib/hooks/useCollections"
import { useDashboards } from "@/lib/hooks/useDashboards"
import { Skeleton } from "@/components/ui/skeleton"

export function StatsCards() {
  const { collections, loading: collectionsLoading, error: collectionsError } = useCollections()
  const { dashboards, loading: dashboardsLoading, error: dashboardsError } = useDashboards()
  const [lastActive, setLastActive] = useState<string>("Just now")
  const [debugInfo, setDebugInfo] = useState<any>(null)

  // Output debug info to console
  useEffect(() => {
    if (collectionsError || dashboardsError) {
      const debug = {
        collectionsError,
        dashboardsError,
        collectionsLength: collections.length,
        dashboardsLength: dashboards.length
      }
      console.error('StatsCards debug info:', debug)
      setDebugInfo(debug)
    }
  }, [collections, dashboards, collectionsError, dashboardsError])

  // Calculate last active timestamp
  useEffect(() => {
    // Try to get from localStorage
    const lastActiveTime = localStorage.getItem('lastActiveTimestamp')
    if (lastActiveTime) {
      try {
        const timestamp = parseInt(lastActiveTime)
        const lastActiveDate = new Date(timestamp)
        const now = new Date()
        const diff = now.getTime() - lastActiveDate.getTime()
        
        // Format as relative time
        if (diff < 60 * 1000) { // less than 1 minute
          setLastActive('Just now')
        } else if (diff < 60 * 60 * 1000) { // less than 1 hour
          const minutes = Math.floor(diff / (60 * 1000))
          setLastActive(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`)
        } else if (diff < 24 * 60 * 60 * 1000) { // less than 1 day
          const hours = Math.floor(diff / (60 * 60 * 1000))
          setLastActive(`${hours} ${hours === 1 ? 'hour' : 'hours'} ago`)
        } else {
          const days = Math.floor(diff / (24 * 60 * 60 * 1000))
          setLastActive(`${days} ${days === 1 ? 'day' : 'days'} ago`)
        }
      } catch (e) {
        setLastActive('Unknown')
      }
    } else {
      // Set current time as last active
      localStorage.setItem('lastActiveTimestamp', Date.now().toString())
      setLastActive('Just now')
    }
  }, [])

  // Update last active timestamp
  useEffect(() => {
    localStorage.setItem('lastActiveTimestamp', Date.now().toString())
  }, [])

  // Count total visualizations from all dashboards
  const getTotalVisualizations = () => {
    if (dashboardsLoading) return "..."
    if (dashboards.length === 0) return "0"

    try {
      const total = dashboards.reduce((sum, dashboard) => {
        // Count charts in the dashboard if they exist
        const chartCount = dashboard.charts?.length || 0
        return sum + chartCount
      }, 0)
      return total.toString()
    } catch (err) {
      console.error("Error calculating visualizations:", err)
      return "0"
    }
  }

  const stats = [
    {
      title: "Total Collections",
      value: collectionsLoading ? "..." : collections.length.toString(),
      icon: <Database className="h-5 w-5 text-blue-500" />,
      description: "Data sources uploaded",
      loading: collectionsLoading,
      error: collectionsError
    },
    {
      title: "Total Visualizations",
      value: getTotalVisualizations(),
      icon: <BarChart3 className="h-5 w-5 text-blue-500" />,
      description: "Charts generated",
      loading: dashboardsLoading,
      error: dashboardsError
    },
    {
      title: "Last Active",
      value: lastActive,
      icon: <Clock className="h-5 w-5 text-blue-500" />,
      description: new Date().toLocaleDateString(),
      loading: false,
      error: null
    },
    {
      title: "Active Dashboards",
      value: dashboardsLoading ? "..." : dashboards.length.toString(),
      icon: <LineChart className="h-5 w-5 text-blue-500" />,
      description: "Saved dashboards",
      loading: dashboardsLoading,
      error: dashboardsError
    },
  ]

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <div key={index} className="rounded-xl bg-gray-800 border border-gray-700 p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">{stat.title}</p>
              {stat.loading ? (
                <Skeleton className="mt-1 h-8 w-16 bg-gray-700" />
              ) : stat.error ? (
                <p className="mt-1 text-xl font-bold text-red-400">Error</p>
              ) : (
                <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">{stat.description}</p>
              {stat.error && (
                <p className="mt-1 text-xs text-red-400 truncate max-w-[180px]" title={stat.error}>
                  {stat.error.slice(0, 50)}...
                </p>
              )}
            </div>
            <div className="rounded-full bg-blue-900/50 p-3">{stat.icon}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
