import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileSpreadsheet, FileText, BarChart, RefreshCw } from "lucide-react"

export function RecentDataSources() {
  const dataSources = [
    {
      id: 1,
      name: "Q1_Sales_Report.xlsx",
      type: "Excel",
      icon: <FileSpreadsheet className="h-5 w-5 text-green-600" />,
      lastImported: "May 1, 2023",
    },
    {
      id: 2,
      name: "Customer_Survey_Results.csv",
      type: "CSV",
      icon: <FileText className="h-5 w-5 text-blue-600" />,
      lastImported: "April 28, 2023",
    },
    {
      id: 3,
      name: "Marketing_Budget_2023.xlsx",
      type: "Excel",
      icon: <FileSpreadsheet className="h-5 w-5 text-green-600" />,
      lastImported: "April 15, 2023",
    },
    {
      id: 4,
      name: "Website_Traffic_Analysis.csv",
      type: "CSV",
      icon: <FileText className="h-5 w-5 text-blue-600" />,
      lastImported: "April 10, 2023",
    },
  ]

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center">
        <h2 className="text-xl font-bold text-gray-900">📁 Recent Data Sources</h2>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your uploaded data files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dataSources.map((source) => (
              <div key={source.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  {source.icon}
                  <div>
                    <p className="text-sm font-medium">{source.name}</p>
                    <p className="text-xs text-gray-500">Imported on {source.lastImported}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <BarChart className="mr-1 h-3.5 w-3.5" />
                    Analyze
                  </Button>
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                    Re-upload
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="mt-4 text-center">
        <Link href="/dashboard/data">
          <Button variant="outline" className="text-teal-600">
            View All Data Sources
          </Button>
        </Link>
      </div>
    </div>
  )
}
