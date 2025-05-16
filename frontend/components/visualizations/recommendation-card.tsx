"use client"

import { useState } from "react"
import { BarChart4, LineChart, PieChart, ScatterChart, Info } from "lucide-react"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { 
  VisualizationRecommendation 
} from "@/lib/visualizationService"

interface RecommendationCardProps {
  recommendation: VisualizationRecommendation
  isSelected: boolean
  onSelect: () => void
}

export function RecommendationCard({ 
  recommendation, 
  isSelected,
  onSelect 
}: RecommendationCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Choose the appropriate icon based on chart type
  const getChartIcon = () => {
    const type = recommendation.type.toLowerCase()
    
    if (type.includes('bar')) {
      return <BarChart4 className="h-6 w-6" />
    } else if (type.includes('line')) {
      return <LineChart className="h-6 w-6" />
    } else if (type.includes('pie')) {
      return <PieChart className="h-6 w-6" />
    } else if (type.includes('scatter')) {
      return <ScatterChart className="h-6 w-6" />
    } else {
      return <BarChart4 className="h-6 w-6" />
    }
  }
  
  // Generate a preview based on the chart type
  const renderPreview = () => {
    if (!recommendation.preview || !recommendation.preview.data) {
      return <div className="w-full h-32 bg-muted/50 flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Preview not available</span>
      </div>
    }
    
    const type = recommendation.type.toLowerCase()
    const data = recommendation.preview.data
    
    if (type.includes('bar')) {
      return (
        <div className="w-full h-32 flex items-end justify-around">
          {data.map((item: any, index: number) => (
            <div key={index} className="flex flex-col items-center">
              <div 
                className="w-6 bg-primary/80 rounded-t-sm" 
                style={{ height: `${(item.value / 200) * 90}px` }}
              ></div>
              <span className="text-xs mt-1 text-muted-foreground">{item.category || 'A'}</span>
            </div>
          ))}
        </div>
      )
    } else if (type.includes('line')) {
      // Simple line chart preview
      return (
        <div className="w-full h-32 flex items-center justify-center relative">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="px-4">
            <polyline
              points={data.map((item: any, index: number) => 
                `${(index / (data.length - 1)) * 100},${100 - (item.value / 100) * 80}`
              ).join(' ')}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />
          </svg>
        </div>
      )
    } else if (type.includes('pie')) {
      // Simple pie preview
      return (
        <div className="w-full h-32 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full overflow-hidden relative">
            {data.map((item: any, index: number) => {
              const total = data.reduce((sum: number, i: any) => sum + i.value, 0)
              const percentage = item.value / total
              const offset = data.slice(0, index).reduce((sum: number, i: any) => sum + (i.value / total), 0)
              
              return (
                <div 
                  key={index}
                  className="absolute"
                  style={{
                    width: '100%',
                    height: '100%',
                    background: `conic-gradient(transparent ${offset * 360}deg, hsl(var(--primary)/${0.7 - index * 0.15}) ${offset * 360}deg ${(offset + percentage) * 360}deg, transparent ${(offset + percentage) * 360}deg)`,
                  }}
                ></div>
              )
            })}
          </div>
        </div>
      )
    } else if (type.includes('scatter')) {
      return (
        <div className="w-full h-32 bg-muted/20 flex items-center justify-center relative">
          {data.map((item: any, index: number) => (
            <div 
              key={index} 
              className="w-2 h-2 rounded-full bg-primary/80 absolute"
              style={{
                left: `${(item.x / 100) * 80 + 10}%`,
                top: `${(item.y / 100) * 80 + 10}%`,
              }}
            ></div>
          ))}
        </div>
      )
    } else {
      // Default fallback
      return <div className="w-full h-32 bg-muted/50 flex items-center justify-center">
        <span className="text-xs text-muted-foreground">{recommendation.type} chart</span>
      </div>
    }
  }
  
  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all",
        isSelected ? "border-primary ring-1 ring-primary" : "",
        isHovered ? "shadow-md" : ""
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="p-4 pb-2 space-y-1">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            {getChartIcon()}
            <Badge variant="outline" className="font-normal">{recommendation.type}</Badge>
          </div>
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={() => onSelect()}
            id={`select-${recommendation.id}`}
          />
        </div>
        <CardTitle className="text-base line-clamp-1 mt-2">
          {recommendation.title}
        </CardTitle>
        <CardDescription className="line-clamp-2">
          {recommendation.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0 pt-2">
        {renderPreview()}
      </CardContent>
      
      <CardFooter className="p-4 flex justify-between items-center">
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Info className="h-4 w-4 mr-1" />
                  <span className="truncate max-w-[100px]">
                    {recommendation.suggestedDimensions?.length 
                      ? `${recommendation.suggestedDimensions.length} field${recommendation.suggestedDimensions.length > 1 ? 's' : ''}` 
                      : 'No fields'}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm font-medium">Suggested Data Fields:</p>
                <ul className="text-xs mt-1 pl-4 list-disc">
                  {recommendation.suggestedDimensions && recommendation.suggestedDimensions.length > 0
                    ? recommendation.suggestedDimensions.map((dim, idx) => (
                        <li key={idx}>{dim}</li>
                      ))
                    : <li>No specific fields suggested</li>
                  }
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onSelect}
          className="h-8"
        >
          {isSelected ? "Deselect" : "Select"}
        </Button>
      </CardFooter>
    </Card>
  )
} 