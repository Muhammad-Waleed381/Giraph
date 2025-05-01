import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileSpreadsheet, FileText, Database, Trash2, BarChart3 } from "lucide-react"

export function RecentConnections() {
  const recentConnections = [
    {
      id: 1,
      name: "Sales_Q1_2023.xlsx",
      type: "Excel",
      icon: <FileSpreadsheet className="h-5 w-5 text-green-600" />,
      date: "May 1, 2023",
    },
    {
      id: 2,
      name: "Customer_Survey.csv",
      type: "CSV",
      icon: <FileText className="h-5 w-5 text-blue-600" />,
      date: "April 28, 2023",
    },
    {
      id: 3,
      name: "Product Database",
      type: "MySQL",
      icon: <Database className="h-5 w-5 text-orange-600" />,
      date: "April 15, 2023",
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Recent Connections</CardTitle>
        <CardDescription>Previously connected data sources</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentConnections.map((connection) => (
            <div
              key={connection.id}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                {connection.icon}
                <div>
                  <p className="font-medium">{connection.name}</p>
                  <p className="text-xs text-gray-500">
                    {connection.type} • Connected on {connection.date}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  <BarChart3 className="mr-1 h-3.5 w-3.5" />
                  Analyze
                </Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
