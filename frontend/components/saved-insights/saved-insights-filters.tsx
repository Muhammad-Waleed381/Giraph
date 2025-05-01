"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, SlidersHorizontal, LayoutGrid, List } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SavedInsightsFiltersProps {
  onSearch?: (query: string) => void
  onFilterChange?: (filters: any) => void
  onViewChange?: (view: "grid" | "list") => void
}

export function SavedInsightsFilters({ onSearch, onFilterChange, onViewChange }: SavedInsightsFiltersProps = {}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [dateFilter, setDateFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [datasetFilter, setDatasetFilter] = useState("all")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(searchQuery)
    }
  }

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode)
    if (onViewChange) {
      onViewChange(mode)
    }
  }

  const applyFilters = () => {
    if (onFilterChange) {
      onFilterChange({
        date: dateFilter,
        type: typeFilter,
        dataset: datasetFilter,
      })
    }
  }

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 gap-2">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search insights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </form>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Filter Insights</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs font-normal text-gray-500">Date Saved</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setDateFilter("all")}>
                <span className={dateFilter === "all" ? "font-medium text-teal-600" : ""}>All Time</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter("7days")}>
                <span className={dateFilter === "7days" ? "font-medium text-teal-600" : ""}>Last 7 Days</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter("30days")}>
                <span className={dateFilter === "30days" ? "font-medium text-teal-600" : ""}>Last 30 Days</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter("90days")}>
                <span className={dateFilter === "90days" ? "font-medium text-teal-600" : ""}>Last 90 Days</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs font-normal text-gray-500">Insight Type</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTypeFilter("all")}>
                <span className={typeFilter === "all" ? "font-medium text-teal-600" : ""}>All Types</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("trend")}>
                <span className={typeFilter === "trend" ? "font-medium text-teal-600" : ""}>Trends</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("anomaly")}>
                <span className={typeFilter === "anomaly" ? "font-medium text-teal-600" : ""}>Anomalies</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("forecast")}>
                <span className={typeFilter === "forecast" ? "font-medium text-teal-600" : ""}>Forecasts</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("segmentation")}>
                <span className={typeFilter === "segmentation" ? "font-medium text-teal-600" : ""}>Segmentation</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs font-normal text-gray-500">Dataset</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setDatasetFilter("all")}>
                <span className={datasetFilter === "all" ? "font-medium text-teal-600" : ""}>All Datasets</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDatasetFilter("sales")}>
                <span className={datasetFilter === "sales" ? "font-medium text-teal-600" : ""}>Sales Data</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDatasetFilter("customer")}>
                <span className={datasetFilter === "customer" ? "font-medium text-teal-600" : ""}>Customer Survey</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDatasetFilter("product")}>
                <span className={datasetFilter === "product" ? "font-medium text-teal-600" : ""}>Product Database</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <Button className="w-full" size="sm" onClick={applyFilters}>
              Apply Filters
            </Button>
          </DropdownMenuContent>
        </DropdownMenu>

        <Select defaultValue="newest">
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="a-z">A-Z</SelectItem>
            <SelectItem value="z-a">Z-A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-md border">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="icon"
            className={`rounded-none rounded-l-md ${viewMode === "grid" ? "bg-teal-600 hover:bg-teal-700" : ""}`}
            onClick={() => handleViewModeChange("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="sr-only">Grid view</span>
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="icon"
            className={`rounded-none rounded-r-md ${viewMode === "list" ? "bg-teal-600 hover:bg-teal-700" : ""}`}
            onClick={() => handleViewModeChange("list")}
          >
            <List className="h-4 w-4" />
            <span className="sr-only">List view</span>
          </Button>
        </div>
        <Button variant="outline" size="icon">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="sr-only">More options</span>
        </Button>
      </div>
    </div>
  )
}
