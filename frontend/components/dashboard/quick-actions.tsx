"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, LinkIcon, BarChart3, MessageSquare } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation" 
import { useState } from "react"

export function QuickActions() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  // Define routes for quick actions based on the actual application structure
  const actions = [
    {
      title: "Upload Data",
      description: "Import CSV, Excel or JSON files",
      icon: <Upload className="h-10 w-10 text-blue-400" />,
      href: "/dashboard/connect",
      id: "upload"
    },
    {
      title: "Connect Google Sheets",
      description: "Link your Google Sheets documents",
      icon: <LinkIcon className="h-10 w-10 text-blue-400" />,
      href: "/dashboard/connect?source=google",
      id: "google"
    },
    {
      title: "Create Visualization",
      description: "Build custom charts and dashboards",
      icon: <BarChart3 className="h-10 w-10 text-blue-400" />,
      href: "/dashboard/visualizations",
      id: "visualize"
    },
    {
      title: "Ask a Question",
      description: "Query your data using natural language",
      icon: <MessageSquare className="h-10 w-10 text-blue-400" />,
      href: "/dashboard/ask",
      id: "ask"
    },
  ]

  const handleAction = (actionId: string, href: string) => {
    // Set loading state for the clicked button
    setLoading(actionId);

    // Simulate API call or preparation before navigation
    setTimeout(() => {
      setLoading(null);
      router.push(href);
    }, 300);
  }

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">⚡ Quick Actions</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => (
          <Card key={action.id} className="transition-all hover:shadow-md bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <div className="rounded-full bg-blue-950/50 p-3 w-fit">{action.icon}</div>
              <CardTitle className="mt-4 text-lg text-white">{action.title}</CardTitle>
              <CardDescription className="text-gray-400">{action.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full bg-blue-700 hover:bg-blue-600"
                onClick={() => handleAction(action.id, action.href)}
                disabled={loading === action.id}
              >
                {loading === action.id ? (
                  <span className="flex items-center">
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Loading...
                  </span>
                ) : (
                  "Get Started"
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
