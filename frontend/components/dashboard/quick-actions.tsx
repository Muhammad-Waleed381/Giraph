import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, LinkIcon, LayoutDashboard, MessageSquare } from "lucide-react"

export function QuickActions() {
  const actions = [
    {
      title: "Upload New Data",
      description: "Import CSV, Excel or other data files",
      icon: <Upload className="h-10 w-10 text-teal-600" />,
      href: "/dashboard/upload",
    },
    {
      title: "Connect Google Sheets",
      description: "Link your Google Sheets documents",
      icon: <LinkIcon className="h-10 w-10 text-teal-600" />,
      href: "/dashboard/connect",
    },
    {
      title: "Create Dashboard",
      description: "Build a new visualization dashboard",
      icon: <LayoutDashboard className="h-10 w-10 text-teal-600" />,
      href: "/dashboard/create",
    },
    {
      title: "Ask a Question",
      description: "Query your data using natural language",
      icon: <MessageSquare className="h-10 w-10 text-teal-600" />,
      href: "/dashboard/ask",
    },
  ]

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">⚡ Quick Actions</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action, index) => (
          <Card key={index} className="transition-all hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="rounded-full bg-teal-50 p-3 w-fit">{action.icon}</div>
              <CardTitle className="mt-4 text-lg">{action.title}</CardTitle>
              <CardDescription>{action.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-teal-600 hover:bg-teal-700">Get Started</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
