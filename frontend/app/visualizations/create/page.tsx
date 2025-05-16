import { CreateDashboardFlow } from "@/components/visualizations/create-dashboard-flow"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { HomeIcon, ChevronRight } from "lucide-react"

export const metadata = {
  title: "Create Dashboard - Giraph",
  description: "Create a new visualization dashboard using AI",
}

export default function CreateVisualizationPage() {
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
              Create Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Create Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Create a new visualization dashboard using AI to analyze and visualize your data
        </p>
      </div>
      
      <CreateDashboardFlow />
    </main>
  )
} 