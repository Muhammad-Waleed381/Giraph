"use client"

import { useState } from "react"
import { MoreHorizontal, Star, Edit, Copy, Share2, Trash2, Download, BarChart4 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Visualization {
  id: string
  title: string
  description: string
  type: string
  thumbnail: string
  lastUpdated: string
  isFavorite: boolean
  charts: number
  dataset: string
}

interface VisualizationCardProps {
  visualization: Visualization
  onToggleFavorite: () => void
}

export function VisualizationCard({ visualization, onToggleFavorite }: VisualizationCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const formattedDate = formatDistanceToNow(new Date(visualization.lastUpdated), {
    addSuffix: true,
  })

  return (
    <Card
      className="overflow-hidden transition-all duration-200 hover:shadow-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        <div className="aspect-video bg-muted overflow-hidden">
          <img
            src={"/SalesPerformance.jpeg"}
            alt={visualization.title}
            className="w-full h-full object-cover transition-transform duration-500 ease-in-out"
            style={{ transform: isHovered ? "scale(1.05)" : "scale(1)" }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-300"
            style={{ opacity: isHovered ? 1 : 0 }}
          >
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
              <Button variant="secondary" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="secondary" size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                onClick={onToggleFavorite}
              >
                <Star
                  className={`h-4 w-4 ${
                    visualization.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  }`}
                />
                <span className="sr-only">
                  {visualization.isFavorite ? "Remove from favorites" : "Add to favorites"}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{visualization.isFavorite ? "Remove from favorites" : "Add to favorites"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg line-clamp-1">{visualization.title}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mr-2">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{visualization.description}</p>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs">
            <BarChart4 className="mr-1 h-3 w-3" />
            {visualization.charts} charts
          </Badge>
          <Badge variant="outline" className="text-xs">
            {visualization.dataset}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="px-4 py-3 border-t bg-muted/20 flex justify-between items-center">
        <span className="text-xs text-muted-foreground">Updated {formattedDate}</span>
        <Badge variant="secondary" className="text-xs">
          {visualization.type}
        </Badge>
      </CardFooter>
    </Card>
  )
}
