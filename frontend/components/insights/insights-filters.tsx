"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Filter, RotateCcw } from "lucide-react"

export function InsightsFilters() {
  const [timeRange, setTimeRange] = useState("all")
  const [insightType, setInsightType] = useState("all")
  const [insightCount, setInsightCount] = useState([5])
  const [metric, setMetric] = useState("all")

  const handleReset = () => {
    setTimeRange("all")
    setInsightType("all")
    setInsightCount([5])
    setMetric("all")
  }

  return (
    <Card className="border-gray-800 bg-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Filter className="h-5 w-5 text-gray-400" />
          Insight Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-300">Time Range</Label>
          <RadioGroup value={timeRange} onValueChange={setTimeRange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all-time" />
              <Label htmlFor="all-time" className="text-sm text-gray-400">
                All Time
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="30days" id="30days" />
              <Label htmlFor="30days" className="text-sm text-gray-400">
                Last 30 Days
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="90days" id="90days" />
              <Label htmlFor="90days" className="text-sm text-gray-400">
                Last Quarter
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1year" id="1year" />
              <Label htmlFor="1year" className="text-sm text-gray-400">
                Last Year
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-300">Insight Type</Label>
          <Select value={insightType} onValueChange={setInsightType}>
            <SelectTrigger className="border-gray-700 bg-gray-700 text-gray-300">
              <SelectValue placeholder="Select insight type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="trends">Growth Trends</SelectItem>
              <SelectItem value="anomalies">Anomalies</SelectItem>
              <SelectItem value="segments">Segmentation</SelectItem>
              <SelectItem value="forecasts">Forecasts</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-300">Number of Insights</Label>
            <span className="text-sm font-medium text-gray-300">{insightCount[0]}</span>
          </div>
          <Slider value={insightCount} min={3} max={10} step={1} onValueChange={setInsightCount} className="py-4" />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-300">Metric of Interest</Label>
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="border-gray-700 bg-gray-700 text-gray-300">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Metrics</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="conversion">Conversion Rate</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
              <SelectItem value="retention">Retention</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white" onClick={handleReset}>
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Reset Filters
        </Button>
      </CardContent>
    </Card>
  )
}
