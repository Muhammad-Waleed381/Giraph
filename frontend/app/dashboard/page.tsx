"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { WelcomePanel } from "@/components/dashboard/welcome-panel"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { RecentDashboards } from "@/components/dashboard/recent-dashboards"
import { RecentDataSources } from "@/components/dashboard/recent-data-sources"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { AIChatWidget } from "@/components/dashboard/ai-chat-widget"
import { useEffect, useState } from "react"
import { useCollections } from "@/lib/hooks/useCollections"
import { useDashboards } from "@/lib/hooks/useDashboards"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  const { collections, loading: collectionsLoading, error: collectionsError } = useCollections();
  const { dashboards, loading: dashboardsLoading, error: dashboardsError } = useDashboards();
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [debugMode, setDebugMode] = useState(false);

  // Try to get username from local storage
  useEffect(() => {
    const storedUser = localStorage.getItem("giraphUser");
    if (storedUser) {
      try {
        const userInfo = JSON.parse(storedUser);
        setUserName(userInfo.name || userInfo.userName);
      } catch (e) {
        console.error("Error parsing user info:", e);
      }
    }

    // Check for debug mode query param
    if (typeof window !== 'undefined' && window.location.search.includes('debug=true')) {
      setDebugMode(true);
    }
  }, []);

  // Show debug info if needed
  const showDebugInfo = debugMode && (collectionsError || dashboardsError);

  return (
    <div className="min-h-screen bg-gray-950 dark:bg-gray-950">
      <DashboardHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <WelcomePanel userName={userName} />
        
        {/* Stats always show, they handle their own loading/error states */}
        <StatsCards />
        
        {/* Show debug info if in debug mode and there are errors */}
        {showDebugInfo && (
          <div className="mb-8 p-4 bg-red-900/20 rounded-xl border border-red-700/50">
            <h3 className="text-red-400 font-medium mb-2">Debug Information</h3>
            <pre className="text-xs text-red-300 bg-gray-900 p-3 rounded overflow-auto max-h-[200px]">
              {JSON.stringify({
                collectionsError,
                dashboardsError,
                collectionsCount: collections?.length || 0,
                dashboardsCount: dashboards?.length || 0
              }, null, 2)}
            </pre>
          </div>
        )}
        
        {/* Loading state */}
        {(collectionsLoading || dashboardsLoading) && !showDebugInfo && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="mb-8">
              <Skeleton className="h-8 w-48 bg-gray-800 mb-4" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-64 bg-gray-800 rounded-xl" />
                ))}
              </div>
            </div>
            <div className="mb-8">
              <Skeleton className="h-8 w-48 bg-gray-800 mb-4" />
              <Skeleton className="h-64 bg-gray-800 rounded-xl" />
            </div>
          </div>
        )}
        
        {/* Content when data is loaded */}
        {!collectionsLoading && !dashboardsLoading && (
          <>
            {/* Show different components based on data availability */}
            {(collections.length > 0 || dashboards.length > 0) ? (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <RecentDashboards />
                <RecentDataSources />
              </div>
            ) : (
              <QuickActions />
            )}
            
            {/* Only show quick actions at bottom if we have both dashboards and collections */}
            {collections.length > 0 && dashboards.length > 0 && (
              <QuickActions />
            )}
          </>
        )}
      </main>
      <AIChatWidget />
    </div>
  )
}
