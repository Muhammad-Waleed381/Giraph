"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X, Loader2 } from "lucide-react"
import { FcGoogle } from "react-icons/fc"
import { useToast } from "@/hooks/use-toast"

interface CloudServicesProps {
  onFileSelected: (filename: string, dataSourceId?: string) => void
}

export function CloudServices({ onFileSelected }: CloudServicesProps) {
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [isListingFiles, setIsListingFiles] = useState<boolean>(false)
  const [isImporting, setIsImporting] = useState<boolean>(false)
  const [availableSheets, setAvailableSheets] = useState<{ id: string, name: string }[]>([])

  const { toast } = useToast()

  const googleSheetsService = {
    name: "Google Sheets",
    logo: <FcGoogle className="h-10 w-10" />,
    description: "Connect your Google Sheets documents",
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      console.log("Initiating Google Sheets connection...")
      setTimeout(async () => {
        setIsConnected(true)
        setIsConnecting(false)
        toast({ title: "Google Connected", description: "Successfully connected to Google account." })
        console.log("Google Sheets connected successfully.")
        await listGoogleSheets()
      }, 1000)
    } catch (error) {
      console.error("Google Sheets connection failed:", error)
      toast({ title: "Connection Failed", description: (error as Error).message || "Could not connect to Google.", variant: "destructive" })
      setIsConnecting(false)
    }
  }

  const listGoogleSheets = async () => {
    setIsListingFiles(true)
    try {
      console.log("Listing Google Sheets...")
      setTimeout(() => {
        setAvailableSheets([
          { id: "mock_spreadsheet_id_1", name: "Sales_Report_2023.xlsx" },
          { id: "mock_spreadsheet_id_2", name: "Customer_Data.csv" },
          { id: "mock_spreadsheet_id_3", name: "Marketing_Budget.xlsx" },
        ])
        setIsListingFiles(false)
        console.log("Google Sheets listed.")
      }, 1500)
    } catch (error) {
      console.error("Failed to list Google Sheets:", error)
      toast({ title: "Listing Failed", description: (error as Error).message || "Could not list Google Sheets.", variant: "destructive" })
      setIsListingFiles(false)
    }
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    setSelectedFile(null)
    setAvailableSheets([])
    toast({ title: "Google Disconnected", description: "Successfully disconnected from Google account." })
    console.log("Google Sheets disconnected.")
  }

  const handleSelectFile = (fileId: string) => {
    setSelectedFile(fileId)
    const selectedSheet = availableSheets.find(sheet => sheet.id === fileId)
    console.log(`Selected Google Sheet: ${selectedSheet?.name} (ID: ${fileId})`)
  }

  const handleConfirmSelectionAndImport = async () => {
    if (!selectedFile) {
      toast({ title: "No File Selected", description: "Please select a sheet to import.", variant: "destructive" })
      return
    }
    setIsImporting(true)
    const selectedSheet = availableSheets.find(sheet => sheet.id === selectedFile)

    if (!selectedSheet) {
      toast({ title: "Error", description: "Selected sheet not found.", variant: "destructive" })
      setIsImporting(false)
      return
    }

    try {
      console.log(`Importing Google Sheet: ${selectedSheet.name} (ID: ${selectedSheet.id})`)
      const response = await fetch('/api/import/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: selectedSheet.id,
          sheetName: selectedSheet.name,
        }),
      })

      const result = await response.json()

      if (!response.ok || result.success === false) {
        throw new Error(result.message || `Failed to import sheet. Status: ${response.status}`)
      }

      toast({
        title: "Import Successful",
        description: `${selectedSheet.name} imported successfully. ${result.data.insertedCount} rows added to collection ${result.data.collectionName}.`,
        className: "bg-green-500 text-white",
      })
      onFileSelected(selectedSheet.name, result.data.dataSourceId)
      document.getElementById(`google-sheets-file-selector`)?.classList.add("hidden")
      setSelectedFile(null)
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
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            {googleSheetsService.logo}
            {isConnected && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                <Check className="h-3 w-3 text-green-600" />
              </div>
            )}
          </div>
          <CardTitle className="mt-4 text-lg">{googleSheetsService.name}</CardTitle>
          <CardDescription>{googleSheetsService.description}</CardDescription>
        </CardHeader>
        <CardFooter>
          {isConnected ? (
            <div className="flex w-full flex-col gap-2">
              <Button
                variant="outline"
                className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={handleDisconnect}
                disabled={isImporting}
              >
                Disconnect
              </Button>
              <Button
                className="w-full bg-teal-600 hover:bg-teal-700"
                onClick={() => {
                  if (availableSheets.length === 0 && !isListingFiles) listGoogleSheets()
                  document.getElementById(`google-sheets-file-selector`)?.classList.remove("hidden")
                }}
                disabled={isListingFiles || isImporting}
              >
                {isListingFiles ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isListingFiles ? "Loading Sheets..." : "Select File"}
              </Button>
            </div>
          ) : (
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isConnecting ? "Connecting..." : "Connect to Google Sheets"}
            </Button>
          )}
        </CardFooter>
      </Card>

      {isConnected && (
        <div id="google-sheets-file-selector" className="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Select a Google Sheet</CardTitle>
              <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => document.getElementById(`google-sheets-file-selector`)?.classList.add("hidden")}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              {isListingFiles && <div className="flex justify-center items-center p-4"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /> <span className="ml-2">Loading sheets...</span></div>}
              {!isListingFiles && availableSheets.length === 0 && <p className="text-center text-muted-foreground">No sheets found or unable to load.</p>}
              {!isListingFiles && availableSheets.length > 0 && (
                <ul className="space-y-2">
                  {availableSheets.map((sheet) => (
                    <li key={sheet.id}>
                      <Button
                        variant="outline"
                        className={`w-full justify-start ${selectedFile === sheet.id ? "font-semibold border-teal-500 bg-teal-50" : ""}`}
                        onClick={() => handleSelectFile(sheet.id)}
                      >
                        {sheet.name}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-teal-600 hover:bg-teal-700"
                disabled={!selectedFile || isImporting || isListingFiles}
                onClick={handleConfirmSelectionAndImport}
              >
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isImporting ? "Importing..." : "Confirm Selection and Import"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
