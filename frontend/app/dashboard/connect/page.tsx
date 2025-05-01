import { DashboardHeader } from "@/components/dashboard/header"
import { ConnectHeader } from "@/components/connect/connect-header"
import { ConnectTabs } from "@/components/connect/connect-tabs"
import { RecentConnections } from "@/components/connect/recent-connections"

export default function ConnectDataPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <ConnectHeader />
        <ConnectTabs />
        <RecentConnections />
      </main>
    </div>
  )
}
