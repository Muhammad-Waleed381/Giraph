import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, FolderTree, LayoutDashboard } from "lucide-react"
import { DashboardsList } from "@/components/visualizations/dashboards-list"
import Link from "next/link"

export const metadata = {
  title: "Visualizations - Giraph",
  description: "Create, manage, and view your data visualizations",
}

export default function VisualizationsPage() {
  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Visualizations</h1>
          <p className="text-muted-foreground">
            Create intelligent visualizations and dashboards from your data
          </p>
        </div>
        <Link href="/visualizations/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Dashboard
          </Button>
        </Link>
      </div>
      
      <Tabs defaultValue="dashboards">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="dashboards" className="flex items-center">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboards
            </TabsTrigger>
            <TabsTrigger value="collections" className="flex items-center">
              <FolderTree className="mr-2 h-4 w-4" />
              Collections
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="dashboards" className="space-y-4">
          <DashboardsList />
        </TabsContent>
        
        <TabsContent value="collections" className="space-y-4">
          <p className="text-muted-foreground">
            Select a collection to view or create visualizations from it
          </p>
          {/* We can add a CollectionsList component here later */}
        </TabsContent>
      </Tabs>
    </main>
  )
} 