"use client"

import { useState, useCallback, useMemo } from "react"
import { AlertCircle, Maximize2, Download, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { GeneratedVisualization } from "@/lib/visualizationService"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import dynamic from "next/dynamic"

// Import the EChartDisplay component
const EChartDisplay = dynamic(() => import("@/components/charts/echart-display").then(mod => mod.EChartDisplay), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full w-full bg-muted/30 rounded-md animate-pulse">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
});

interface GeneratedDashboardViewProps {
  visualizations: GeneratedVisualization[]
  collectionName: string
}

export function GeneratedDashboardView({
  visualizations,
  collectionName
}: GeneratedDashboardViewProps) {
  const [expandedChart, setExpandedChart] = useState<GeneratedVisualization | null>(null)
  const [layoutMode, setLayoutMode] = useState<"grid" | "tabs">("grid")
  
  // Handle chart expansion for fullscreen view
  const handleExpandChart = useCallback((chart: GeneratedVisualization) => {
    setExpandedChart(chart)
  }, [])
  
  // Handle chart download/export
  const handleExportChart = useCallback((chart: GeneratedVisualization) => {
    // Get the chart canvas
    const chartElement = document.getElementById(`chart-${chart.id}`)?.querySelector('canvas')
    if (!chartElement) return
    
    // Create a temporary link to download the chart as PNG
    const link = document.createElement('a')
    link.download = `${chart.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`
    link.href = (chartElement as HTMLCanvasElement).toDataURL('image/png')
    link.click()
  }, [])
  
  // Handle errors in visualizations
  const hasErrors = useMemo(() => visualizations.some(viz => viz.error), [visualizations])
  
  // Calculate layout based on the number of visualizations
  const layoutClass = useMemo(() => {
    const count = visualizations.length
    if (count === 1) return "grid-cols-1"
    if (count === 2) return "grid-cols-1 lg:grid-cols-2"
    if (count === 3) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  }, [visualizations.length])
  
  // Render echarts option
  const renderChart = useCallback((chart: GeneratedVisualization, height: string = "350px") => {
    if (chart.error) {
      return (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {chart.error.message || "Failed to generate this visualization"}
          </AlertDescription>
        </Alert>
      )
    }
    
    return (
      <div style={{ height, width: "100%" }} id={`chart-${chart.id}`} className="chart-container">
        <EChartDisplay
          option={chart.options}
          style={{ height: "100%", width: "100%" }}
          className="rounded-md"
        />
      </div>
    )
  }, [])
  
  return (
    <div className="space-y-6">
      {hasErrors && (
        <Alert variant="warning" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            Some visualizations encountered errors and could not be rendered properly.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-medium">Collection: <Badge>{collectionName}</Badge></h3>
          <p className="text-sm text-muted-foreground mt-1">
            {visualizations.length} visualization{visualizations.length !== 1 ? 's' : ''} generated
          </p>
        </div>
        
        <Tabs 
          value={layoutMode} 
          onValueChange={(value) => {
            if (value === "grid" || value === "tabs") {
              setLayoutMode(value);
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="grid">Grid</TabsTrigger>
            <TabsTrigger value="tabs">Tabs</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Grid Layout */}
      {layoutMode === "grid" && (
        <div className={`grid ${layoutClass} gap-6`}>
          {visualizations.map((chart) => (
            <Card key={chart.id} className="h-full flex flex-col chart-card">
              <CardHeader className="pb-2 flex justify-between items-start">
                <div>
                  <CardTitle className="text-base font-medium">{chart.title}</CardTitle>
                  <Badge variant="outline" className="mt-1 text-xs">{chart.type}</Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExpandChart(chart)}>
                      <Maximize2 className="mr-2 h-4 w-4" />
                      Expand
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportChart(chart)}>
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-grow pt-0 pb-4">
                {renderChart(chart)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Tabs Layout */}
      {layoutMode === "tabs" && (
        <Card>
          <Tabs defaultValue={visualizations[0]?.id}>
            <CardHeader className="pb-0">
              <TabsList className="w-full justify-start overflow-auto">
                {visualizations.map((chart) => (
                  <TabsTrigger key={chart.id} value={chart.id} className="flex items-center space-x-2">
                    <span>{chart.title}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </CardHeader>
            <CardContent className="mt-4">
              {visualizations.map((chart) => (
                <TabsContent key={chart.id} value={chart.id} className="mt-0">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <Badge variant="outline">{chart.type}</Badge>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleExpandChart(chart)}>
                        <Maximize2 className="mr-2 h-4 w-4" />
                        Expand
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleExportChart(chart)}>
                        <Download className="mr-2 h-4 w-4" />
                        Export PNG
                      </Button>
                    </div>
                  </div>
                  {renderChart(chart, "500px")}
                </TabsContent>
              ))}
            </CardContent>
          </Tabs>
        </Card>
      )}
      
      {/* Expanded chart dialog */}
      <Dialog 
        open={!!expandedChart} 
        onOpenChange={(open) => {
          if (!open) setExpandedChart(null);
        }}
      >
        <DialogContent className="max-w-5xl w-[95vw]" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="p-4 h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{expandedChart?.title}</h2>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => expandedChart && handleExportChart(expandedChart)}
                type="button"
              >
                <Download className="mr-2 h-4 w-4" />
                Export PNG
              </Button>
            </div>
            {expandedChart && renderChart(expandedChart, "calc(80vh - 100px)")}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 