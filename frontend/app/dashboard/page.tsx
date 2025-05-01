import { DashboardHeader } from "@/components/dashboard/header"
import { WelcomePanel } from "@/components/dashboard/welcome-panel"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { RecentDashboards } from "@/components/dashboard/recent-dashboards"
import { RecentDataSources } from "@/components/dashboard/recent-data-sources"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { AIChatWidget } from "@/components/dashboard/ai-chat-widget"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <main className="mx-auto px-4 py-8">
        <WelcomePanel userName="Sarah" />
        <StatsCards />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <RecentDashboards />
          <RecentDataSources />
        </div>
        <QuickActions />
      </main>
      <AIChatWidget />
    </div>
  )
}
