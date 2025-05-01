import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit, ExternalLink, PieChart, BarChart, LineChart } from "lucide-react"

export function RecentDashboards() {
  const dashboards = [
    {
      id: 1,
      title: "Sales Performance 2023",
      description: "Monthly revenue and growth metrics",
      lastUpdated: "2 days ago",
      icon: <BarChart className="h-5 w-5 text-orange-500" />,
    },
    {
      id: 2,
      title: "Customer Segmentation",
      description: "Analysis of customer demographics",
      lastUpdated: "1 week ago",
      icon: <PieChart className="h-5 w-5 text-teal-500" />,
    },
    {
      id: 3,
      title: "Marketing Campaign ROI",
      description: "Performance metrics for Q1 campaigns",
      lastUpdated: "2 weeks ago",
      icon: <LineChart className="h-5 w-5 text-blue-500" />,
    },
  ]

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center">
        <h2 className="text-xl font-bold text-gray-900">🧩 Recently Accessed Dashboards</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {dashboards.map((dashboard) => (
          <Card key={dashboard.id} className="overflow-hidden">
            <CardHeader className="p-4 pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {dashboard.icon}
                  <CardTitle className="text-base">{dashboard.title}</CardTitle>
                </div>
              </div>
              <CardDescription className="mt-1 text-xs">{dashboard.description}</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-32 rounded-md bg-gray-100 flex items-center justify-center">
                <img
                  src="/placeholder.svg?height=128&width=256"
                  alt="Dashboard preview"
                  className="h-full w-full object-cover"
                />
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between border-t p-4 pt-3">
              <span className="text-xs text-gray-500">Updated {dashboard.lastUpdated}</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  <Edit className="mr-1 h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  Open
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      <div className="mt-4 text-center">
        <Link href="/dashboard/all">
          <Button variant="outline" className="text-teal-600">
            View All Dashboards
          </Button>
        </Link>
      </div>
    </div>
  )
}
