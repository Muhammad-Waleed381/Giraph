"use client"

import { useState, useEffect } from "react"
import { LayoutGrid, Send, Check, CheckCircle2, Loader2, CircleX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue
} from "@/components/ui/select"
import { RecommendationCard } from "./recommendation-card"
import { GeneratedDashboardView } from "./generated-dashboard-view"
import visualizationService, { 
  VisualizationRecommendation, 
  GeneratedVisualization 
} from "@/lib/visualizationService"

type StepState = "idle" | "loading" | "complete" | "error"

export function CreateDashboardFlow() {
  // State for the multi-step flow
  const [step, setStep] = useState<number>(1)
  const [stepStates, setStepStates] = useState<Record<number, StepState>>({
    1: "idle",
    2: "idle",
    3: "idle",
    4: "idle"
  })
  
  // Data states
  const [collections, setCollections] = useState<string[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>("")
  const [datasetInfo, setDatasetInfo] = useState<any>(null)
  const [analysisSummary, setAnalysisSummary] = useState<string>("")
  const [recommendations, setRecommendations] = useState<VisualizationRecommendation[]>([])
  const [cacheId, setCacheId] = useState<string>("")
  const [refinementPrompt, setRefinementPrompt] = useState<string>("")
  const [selectedRecommendations, setSelectedRecommendations] = useState<Record<string, boolean>>({})
  const [generatedVisualizations, setGeneratedVisualizations] = useState<GeneratedVisualization[]>([])
  
  // Save dashboard state
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false)
  const [dashboardName, setDashboardName] = useState<string>("")
  const [dashboardDescription, setDashboardDescription] = useState<string>("")
  
  const { toast } = useToast()
  
  // Load collections on component mount
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const collectionsData = await visualizationService.getCollections()
        setCollections(collectionsData)
      } catch (error) {
        console.error("Failed to fetch collections:", error)
        toast({
          title: "Error",
          description: "Failed to load collections. Please try again.",
          variant: "destructive"
        })
      }
    }
    
    fetchCollections()
  }, [toast])
  
  // Handle collection selection
  const handleCollectionSelect = async (value: string) => {
    setSelectedCollection(value)
    setStepStates({ ...stepStates, 1: "complete" })
    setStep(2)
  }
  
  // Fetch recommendations for selected collection
  const fetchRecommendations = async () => {
    if (!selectedCollection) return
    
    try {
      setStepStates({ ...stepStates, 2: "loading" })
      
      const result = await visualizationService.getRecommendations(selectedCollection)
      
      setCacheId(result.recommendationCacheId)
      setDatasetInfo(result.dataset_info)
      // Convert analysis_summary to string if it's an object
      if (typeof result.analysis_summary === 'object') {
        // Extract key insights if available or convert the entire object to a string
        if (result.analysis_summary.key_insights && Array.isArray(result.analysis_summary.key_insights)) {
          setAnalysisSummary(result.analysis_summary.key_insights.join('\n• '));
        } else {
          setAnalysisSummary(JSON.stringify(result.analysis_summary));
        }
      } else {
        setAnalysisSummary(result.analysis_summary);
      }
      setRecommendations(result.recommended_visualizations)
      
      setStepStates({ ...stepStates, 2: "complete" })
    } catch (error) {
      console.error("Failed to get recommendations:", error)
      setStepStates({ ...stepStates, 2: "error" })
      toast({
        title: "Error",
        description: "Failed to generate visualization recommendations. Please try again.",
        variant: "destructive"
      })
    }
  }
  
  // Handle refinement prompt submission
  const handleRefinementSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!refinementPrompt.trim() || !cacheId) return
    
    try {
      setStepStates({ ...stepStates, 3: "loading" })
      
      const result = await visualizationService.refineRecommendations(
        cacheId,
        refinementPrompt,
        recommendations
      )
      
      setCacheId(result.recommendationCacheId)
      setRecommendations(result.refined_visualizations)
      setRefinementPrompt("")
      
      setStepStates({ ...stepStates, 3: "complete" })
      
      toast({
        title: "Recommendations Refined",
        description: result.refinement_summary,
      })
    } catch (error) {
      console.error("Failed to refine recommendations:", error)
      setStepStates({ ...stepStates, 3: "error" })
      toast({
        title: "Error",
        description: "Failed to refine recommendations. Please try again.",
        variant: "destructive"
      })
    }
  }
  
  // Toggle recommendation selection
  const toggleRecommendationSelection = (id: string) => {
    setSelectedRecommendations(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }
  
  // Generate final visualizations
  const generateVisualizations = async () => {
    // Get selected recommendation IDs
    const selectedIds = Object.entries(selectedRecommendations)
      .filter(([_, selected]) => selected)
      .map(([id, _]) => id)
    
    if (selectedIds.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one visualization to generate.",
        variant: "destructive"
      })
      return
    }
    
    try {
      setStepStates(prevStates => ({ ...prevStates, 4: "loading" }))
      
      const result = await visualizationService.generateVisualizations(cacheId, selectedIds)
      
      setGeneratedVisualizations(result.generatedVisualizations)
      setStepStates(prevStates => ({ ...prevStates, 4: "complete" }))
      
      // Move to the generated dashboard view
      setStep(4)
      
      toast({
        title: "Success",
        description: `Generated ${result.generatedVisualizations.length} visualizations successfully.`,
      })
    } catch (error) {
      console.error("Failed to generate visualizations:", error)
      setStepStates(prevStates => ({ ...prevStates, 4: "error" }))
      toast({
        title: "Error",
        description: "Failed to generate visualizations. Please try again.",
        variant: "destructive"
      })
    }
  }
  
  // Save dashboard
  const handleSaveDashboard = async () => {
    if (!dashboardName.trim()) {
      toast({
        title: "Name Required",
        description: "Please provide a name for your dashboard.",
        variant: "destructive"
      })
      return
    }
    
    try {
      await visualizationService.saveDashboard(
        dashboardName,
        dashboardDescription,
        selectedCollection,
        generatedVisualizations
      )
      
      setShowSaveDialog(false)
      
      toast({
        title: "Dashboard Saved",
        description: "Your dashboard has been saved successfully.",
      })
    } catch (error) {
      console.error("Failed to save dashboard:", error)
      toast({
        title: "Error",
        description: "Failed to save dashboard. Please try again.",
        variant: "destructive"
      })
    }
  }
  
  // Render step 1: Collection selection
  const renderStep1 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">1. Select Data Collection</h2>
      <p className="text-muted-foreground">
        Choose the data collection you want to visualize.
      </p>
      
      <div className="max-w-md">
        <Select onValueChange={handleCollectionSelect} value={selectedCollection}>
          <SelectTrigger>
            <SelectValue placeholder="Select a collection" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Available Collections</SelectLabel>
              {collections.map(collection => (
                <SelectItem key={collection} value={collection}>
                  {collection}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
  
  // Render step 2: AI Recommendations
  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">2. AI-Generated Recommendations</h2>
        {stepStates[2] === "idle" ? (
          <Button onClick={fetchRecommendations}>
            Generate Recommendations
          </Button>
        ) : stepStates[2] === "loading" ? (
          <Button disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </Button>
        ) : null}
      </div>
      
      {stepStates[2] === "complete" && (
        <>
          {analysisSummary && (
            <div className="p-4 bg-muted rounded-md mb-4">
              <h3 className="font-medium mb-2">Data Analysis Summary</h3>
              <div className="text-sm text-muted-foreground whitespace-pre-line">
                {analysisSummary.startsWith('•') ? analysisSummary : `• ${analysisSummary}`}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map(recommendation => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                isSelected={!!selectedRecommendations[recommendation.id]}
                onSelect={() => toggleRecommendationSelection(recommendation.id)}
              />
            ))}
          </div>
          
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)}>
              Refine Recommendations
              <LayoutGrid className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      )}
      
      {stepStates[2] === "error" && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          <p className="flex items-center">
            <CircleX className="mr-2 h-4 w-4" />
            Failed to generate recommendations. Please try again.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={fetchRecommendations}
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  )
  
  // Render step 3: Refinement
  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">3. Select and Refine Visualizations</h2>
        <div>
          {recommendations.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {Object.values(selectedRecommendations).filter(Boolean).length} selected
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Add refinement form */}
      <div className="bg-muted/40 p-4 rounded-md mb-2">
        <h3 className="text-sm font-medium mb-2">Refine Visualizations</h3>
        <form onSubmit={handleRefinementSubmit} className="flex gap-2">
          <div className="flex-grow">
          <Input
              placeholder="E.g., Add a sales by region chart, change colors to blue theme..."
            value={refinementPrompt}
            onChange={(e) => setRefinementPrompt(e.target.value)}
            disabled={stepStates[3] === "loading"}
              className="w-full"
          />
          </div>
          <Button 
            type="submit" 
            disabled={!refinementPrompt.trim() || stepStates[3] === "loading"}
          >
            {stepStates[3] === "loading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refining...
              </>
            ) : (
              <>
                Refine
                <Send className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          Type natural language instructions to refine your visualization recommendations.
        </p>
        </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {recommendations.map(recommendation => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            isSelected={!!selectedRecommendations[recommendation.id]}
            onSelect={() => toggleRecommendationSelection(recommendation.id)}
          />
        ))}
      </div>
      
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={() => setStep(2)}>
          Back
        </Button>
        <Button 
          onClick={generateVisualizations} 
          disabled={stepStates[4] === "loading" || Object.values(selectedRecommendations).filter(Boolean).length === 0}
        >
          {stepStates[4] === "loading" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Dashboard...
            </>
          ) : (
            <>
          Generate Dashboard
          <Check className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
  
  // Render step 4: Generated Dashboard
  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">4. Your Generated Dashboard</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setStep(3)}>
            Back to Refinement
          </Button>
          <Button onClick={() => setShowSaveDialog(true)}>
            Save Dashboard
          </Button>
        </div>
      </div>
      
      {stepStates[4] === "loading" ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Generating Your Dashboard</p>
              <p className="text-sm text-muted-foreground">
                Creating beautiful visualizations based on your data...
              </p>
              <div className="w-64 h-2 bg-muted rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
        </div>
        </Card>
      ) : (
        <GeneratedDashboardView 
          visualizations={generatedVisualizations} 
          collectionName={selectedCollection}
        />
      )}
    </div>
  )
  
  // Determine which step content to render
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return renderStep1()
      case 2:
        return renderStep2()
      case 3:
        return renderStep3()
      case 4:
        return renderStep4()
      default:
        return null
    }
  }
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Progress steps */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            {s > 1 && (
              <Separator 
                className={`w-6 md:w-12 mx-2 ${
                  step >= s ? "bg-primary" : "bg-muted"
                }`} 
              />
            )}
            <div 
              className={`
                flex items-center justify-center w-8 h-8 rounded-full 
                ${step === s 
                  ? "bg-primary text-primary-foreground" 
                  : step > s 
                    ? "bg-primary/20 text-primary" 
                    : "bg-muted text-muted-foreground"
                }
              `}
            >
              {step > s ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <span>{s}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Main content */}
      <Card>
        <CardContent className="p-6">
          {renderStepContent()}
        </CardContent>
      </Card>
      
      {/* Save dashboard dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Dashboard</DialogTitle>
            <DialogDescription>
              Give your dashboard a name and description to save it for future reference.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Dashboard Name</Label>
              <Input
                id="name"
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                placeholder="My Sales Dashboard"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={dashboardDescription}
                onChange={(e) => setDashboardDescription(e.target.value)}
                placeholder="This dashboard shows key sales metrics and trends..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDashboard}>
              Save Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 