"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, X, Loader2, ListFilter, FileSpreadsheet, Sheet } from "lucide-react"
import { FcGoogle } from "react-icons/fc"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"

interface CloudServicesProps {
  onFileSelected: (filename: string, dataSourceId?: string, type?: 'google_sheet') => void
}

interface GoogleSpreadsheet {
  id: string;
  name: string;
}

interface GoogleSheetTab {
  id: string;
  title: string;
}

export function CloudServices({ onFileSelected }: CloudServicesProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false)

  const [spreadsheets, setSpreadsheets] = useState<GoogleSpreadsheet[]>([])
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string | null>(null)
  const [isLoadingSpreadsheets, setIsLoadingSpreadsheets] = useState<boolean>(false)

  const [sheetTabs, setSheetTabs] = useState<GoogleSheetTab[]>([])
  const [selectedSheetTitle, setSelectedSheetTitle] = useState<string | null>(null)
  const [isLoadingSheetTabs, setIsLoadingSheetTabs] = useState<boolean>(false)
  
  const [isImporting, setIsImporting] = useState<boolean>(false)

  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  const googleSheetsService = {
    name: "Google Sheets",
    logo: <FcGoogle className="h-10 w-10" />,
    description: "Connect your Google Sheets documents",
  }

  // Check if already authenticated on component mount
  useEffect(() => {
    const authStatus = localStorage.getItem('googleAuthStatus')
    if (authStatus === 'authenticated') {
      setIsAuthenticated(true)
      fetchSpreadsheets()
    }
  }, [])

  useEffect(() => {
    const authStatus = searchParams.get("google_auth_status")
    const message = searchParams.get("message")

    if (authStatus) {
      if (authStatus === "success") {
        toast({ title: "Google Connected", description: "Successfully authenticated with Google." })
        setIsAuthenticated(true)
        // Store authentication status in localStorage
        localStorage.setItem('googleAuthStatus', 'authenticated')
        fetchSpreadsheets()
      } else if (authStatus === "error") {
        toast({ title: "Google Connection Failed", description: message || "Could not authenticate with Google.", variant: "destructive" })
        setIsAuthenticated(false)
        localStorage.removeItem('googleAuthStatus')
      }
      router.replace("/dashboard/connect")
    }
  }, [searchParams, router, toast])

  const handleConnect = async () => {
    setIsAuthenticating(true)
    try {
      const response = await fetch('/api/google/auth')
      if (!response.ok) {
        const errorResult = await response.json()
        throw new Error(errorResult.message || "Failed to get Google Auth URL")
      }
      const result = await response.json()
      if (result.success && result.data.authUrl) {
        window.location.href = result.data.authUrl
      } else {
        throw new Error("Invalid response for Google Auth URL")
      }
    } catch (error) {
      console.error("Google Sheets connection initiation failed:", error)
      toast({ title: "Connection Failed", description: (error as Error).message || "Could not initiate connection to Google.", variant: "destructive" })
      setIsAuthenticating(false)
    }
  }

  const fetchSpreadsheets = async () => {
    setIsLoadingSpreadsheets(true)
    setSpreadsheets([])
    setSelectedSpreadsheetId(null)
    setSheetTabs([])
    setSelectedSheetTitle(null)
    try {
      const response = await fetch('/api/google/sheets')
      if (!response.ok) {
        // If unauthorized, clear authentication status
        if (response.status === 401) {
          setIsAuthenticated(false)
          localStorage.removeItem('googleAuthStatus')
          toast({ title: "Session Expired", description: "Your Google session has expired. Please reconnect.", variant: "destructive" })
          return
        }
        const errorResult = await response.json()
        throw new Error(errorResult.message || "Failed to fetch spreadsheets")
      }
      const result = await response.json()
      if (result.success && result.data) {
        setSpreadsheets(result.data)
        if (result.data.length === 0) {
          toast({ title: "No Spreadsheets Found", description: "No Google Spreadsheets found in your account.", variant: "default" })
        }
      } else {
        throw new Error("Invalid response when fetching spreadsheets")
      }
    } catch (error) {
      console.error("Failed to list Google Spreadsheets:", error)
      toast({ title: "Listing Failed", description: (error as Error).message || "Could not list Google Spreadsheets.", variant: "destructive" })
    } finally {
      setIsLoadingSpreadsheets(false)
    }
  }

  const handleSpreadsheetSelect = (spreadsheetId: string) => {
    setSelectedSpreadsheetId(spreadsheetId)
    setSelectedSheetTitle(null)
    setSheetTabs([])
    if (spreadsheetId) {
      fetchSheetTabs(spreadsheetId)
    }
  }

  const fetchSheetTabs = async (spreadsheetId: string) => {
    setIsLoadingSheetTabs(true)
    try {
      const response = await fetch(`/api/google/sheets/${spreadsheetId}/tabs`)
      if (!response.ok) {
        // If unauthorized, clear authentication status
        if (response.status === 401) {
          setIsAuthenticated(false)
          localStorage.removeItem('googleAuthStatus')
          toast({ title: "Session Expired", description: "Your Google session has expired. Please reconnect.", variant: "destructive" })
          return
        }
        const errorResult = await response.json()
        throw new Error(errorResult.message || "Failed to fetch sheet tabs")
      }
      const result = await response.json()
      if (result.success && result.data) {
        setSheetTabs(result.data)
        if (result.data.length === 0) {
          toast({ title: "No Tabs Found", description: "Selected spreadsheet has no sheets/tabs.", variant: "default" })
        }
      } else {
        throw new Error("Invalid response when fetching sheet tabs")
      }
    } catch (error) {
      console.error(`Failed to list tabs for spreadsheet ${spreadsheetId}:`, error)
      toast({ title: "Listing Tabs Failed", description: (error as Error).message || "Could not list tabs for the selected spreadsheet.", variant: "destructive" })
    } finally {
      setIsLoadingSheetTabs(false)
    }
  }
  
  const handleSheetTabSelect = (sheetTitle: string) => {
    setSelectedSheetTitle(sheetTitle)
  }

  const handleDisconnect = () => {
    // Clear authentication from local storage
    localStorage.removeItem('googleAuthStatus')
    // Clear auth state
    setIsAuthenticated(false)
    setSpreadsheets([])
    setSelectedSpreadsheetId(null)
    setSheetTabs([])
    setSelectedSheetTitle(null)
    // Also clear Google cookies via API call
    fetch('/api/google/logout', { method: 'POST' })
      .then(() => {
        toast({ title: "Google Disconnected", description: "Disconnected from Google account on this browser." })
      })
      .catch(error => {
        console.error("Error logging out from Google:", error)
        toast({ title: "Google Disconnected", description: "Disconnected from Google account on this browser." })
      })
  }

  const handleImport = async () => {
    if (!selectedSpreadsheetId || !selectedSheetTitle) {
      toast({ title: "Selection Incomplete", description: "Please select both a spreadsheet and a specific sheet to import.", variant: "destructive" })
      return
    }
    setIsImporting(true)
    try {
      const response = await fetch('/api/import/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: selectedSpreadsheetId,
          sheetName: selectedSheetTitle, 
        }),
      })

      const result = await response.json()

      // Handle the case where we need to authenticate with Google
      if (result.authRequired && result.authUrl) {
        window.location.href = result.authUrl
        return
      }

      if (!response.ok || result.success === false) {
        throw new Error(result.message || `Failed to import sheet. Status: ${response.status}`)
      }

      toast({
        title: "Import Successful",
        description: `${selectedSheetTitle} from spreadsheet imported successfully. ${result.data?.insertedCount || 0} rows added to collection ${result.data?.collectionName}.`,
      })
      
      // Pass the collection name as the file name
      onFileSelected(result.data?.collectionName || selectedSheetTitle, result.data?.dataSourceId, 'google_sheet')
      setSelectedSpreadsheetId(null)
      setSelectedSheetTitle(null)
      setSpreadsheets([])
      setSheetTabs([])
    } catch (error) {
      console.error("Google Sheet import failed:", error)
      toast({ title: "Import Failed", description: (error as Error).message || "Could not import the selected sheet.", variant: "destructive" })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="transition-all hover:shadow-md w-full max-w-md mx-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            {googleSheetsService.logo}
            {isAuthenticated && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 border border-green-300">
                <Check className="h-4 w-4 text-green-600" />
              </div>
            )}
          </div>
          <CardTitle className="mt-4 text-xl">{googleSheetsService.name}</CardTitle>
          <CardDescription>{googleSheetsService.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAuthenticated && (
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 text-base"
              onClick={handleConnect}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FcGoogle className="mr-2 h-5 w-5" />}
              {isAuthenticating ? "Connecting..." : "Connect to Google Sheets"}
            </Button>
          )}

          {isAuthenticated && (
            <>
              <div className="space-y-2">
                <label htmlFor="spreadsheet-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Spreadsheet</label>
                <Select
                  value={selectedSpreadsheetId || ""}
                  onValueChange={handleSpreadsheetSelect}
                  disabled={isLoadingSpreadsheets || isImporting}
                >
                  <SelectTrigger id="spreadsheet-select" className="w-full">
                    <SelectValue placeholder={isLoadingSpreadsheets ? "Loading spreadsheets..." : "Choose a spreadsheet"} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingSpreadsheets && <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading...</div>}
                    {!isLoadingSpreadsheets && spreadsheets.length === 0 && <div className="p-2 text-sm text-center text-muted-foreground">No spreadsheets found.</div>}
                    {spreadsheets.map((ss) => (
                      <SelectItem key={ss.id} value={ss.id}>
                        <div className="flex items-center">
                           <FileSpreadsheet className="h-4 w-4 mr-2 opacity-70" /> 
                           {ss.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSpreadsheetId && (
                <div className="space-y-2">
                  <label htmlFor="sheet-tab-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Sheet (Tab)</label>
                  <Select
                    value={selectedSheetTitle || ""}
                    onValueChange={handleSheetTabSelect}
                    disabled={isLoadingSheetTabs || !selectedSpreadsheetId || isImporting}
                  >
                    <SelectTrigger id="sheet-tab-select" className="w-full">
                      <SelectValue placeholder={isLoadingSheetTabs ? "Loading sheets..." : "Choose a sheet"} />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingSheetTabs && <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading...</div>}
                      {!isLoadingSheetTabs && sheetTabs.length === 0 && <div className="p-2 text-sm text-center text-muted-foreground">No sheets found in this spreadsheet.</div>}
                      {sheetTabs.map((tab) => (
                        <SelectItem key={tab.id.toString()} value={tab.title}>
                          <div className="flex items-center">
                            <Sheet className="h-4 w-4 mr-2 opacity-70" />
                            {tab.title}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base"
                onClick={handleImport}
                disabled={!selectedSpreadsheetId || !selectedSheetTitle || isImporting || isLoadingSpreadsheets || isLoadingSheetTabs}
              >
                {isImporting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Check className="mr-2 h-5 w-5" />}
                {isImporting ? "Importing Data..." : "Import Selected Sheet"}
              </Button>
            </>
          )}
        </CardContent>
        <CardFooter> 
            {isAuthenticated && (
                 <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleDisconnect}
                    disabled={isAuthenticating || isImporting}
                  >
                    Disconnect Google Account
                </Button>
            )}
        </CardFooter>
      </Card>
    </div>
  )
}
