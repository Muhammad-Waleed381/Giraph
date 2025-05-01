import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart3, Check } from "lucide-react"

interface DataPreviewProps {
  data: {
    columns: string[]
    rows: Record<string, string>[]
    totalRows: number
  }
}

export function DataPreview({ data }: DataPreviewProps) {
  return (
    <Card className="mt-8 border-teal-200 bg-teal-50/50 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-teal-100 p-2">
            <BarChart3 className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <CardTitle className="text-xl">🧪 Smart Preview</CardTitle>
            <CardDescription>Here&apos;s what we found in your data</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {data.columns.map((column) => (
              <div
                key={column}
                className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-medium shadow-sm"
              >
                <Check className="h-3 w-3 text-teal-600" />
                {column}
              </div>
            ))}
          </div>

          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  {data.columns.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((row, index) => (
                  <TableRow key={index}>
                    {data.columns.map((column) => (
                      <TableCell key={column}>{row[column]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="text-center text-sm text-gray-500">
            Showing {data.rows.length} of {data.totalRows.toLocaleString()} rows
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-teal-200 bg-teal-50">
        <div className="text-sm">
          <span className="font-medium">Looks good?</span> Giraph can analyze this data for insights.
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600">Generate Insights</Button>
      </CardFooter>
    </Card>
  )
}
