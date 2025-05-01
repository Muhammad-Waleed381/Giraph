"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X } from "lucide-react"

interface CloudServicesProps {
  onFileSelected: (filename: string) => void
}

export function CloudServices({ onFileSelected }: CloudServicesProps) {
  const [connectedServices, setConnectedServices] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  const cloudServices = [
    {
      name: "Google Sheets",
      logo: "/placeholder.svg?height=40&width=40",
      description: "Connect your Google Sheets documents",
    },
    {
      name: "Google Drive",
      logo: "/placeholder.svg?height=40&width=40",
      description: "Access files from your Google Drive",
    },
    {
      name: "Dropbox",
      logo: "/placeholder.svg?height=40&width=40",
      description: "Connect to your Dropbox account",
    },
    {
      name: "OneDrive",
      logo: "/placeholder.svg?height=40&width=40",
      description: "Access files from Microsoft OneDrive",
    },
  ]

  const mockFiles = ["Sales_Report_2023.xlsx", "Customer_Data.csv", "Marketing_Budget.xlsx", "Website_Analytics.csv"]

  const handleConnect = (serviceName: string) => {
    // Simulate OAuth flow
    setTimeout(() => {
      if (!connectedServices.includes(serviceName)) {
        setConnectedServices([...connectedServices, serviceName])
      }
    }, 1000)
  }

  const handleDisconnect = (serviceName: string) => {
    setConnectedServices(connectedServices.filter((name) => name !== serviceName))
    if (selectedFile) {
      setSelectedFile(null)
    }
  }

  const handleSelectFile = (filename: string) => {
    setSelectedFile(filename)
    onFileSelected(filename)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cloudServices.map((service) => (
          <Card key={service.name} className="transition-all hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <img src={service.logo || "/placeholder.svg"} alt={service.name} className="h-10 w-10 rounded-md" />
                {connectedServices.includes(service.name) && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                    <Check className="h-3 w-3 text-green-600" />
                  </div>
                )}
              </div>
              <CardTitle className="mt-4 text-lg">{service.name}</CardTitle>
              <CardDescription>{service.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              {connectedServices.includes(service.name) ? (
                <div className="flex w-full flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleDisconnect(service.name)}
                  >
                    Disconnect
                  </Button>
                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-700"
                    onClick={() => document.getElementById(`${service.name}-modal`)?.classList.remove("hidden")}
                  >
                    Select Files
                  </Button>
                </div>
              ) : (
                <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={() => handleConnect(service.name)}>
                  Connect
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Mock file picker modal for Google Sheets */}
      <div id="Google Sheets-modal" className="hidden">
        <Card className="mt-6 border shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Select a Google Sheet</CardTitle>
              <CardDescription>Connected as: user@example.com</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => document.getElementById("Google Sheets-modal")?.classList.add("hidden")}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockFiles.map((file) => (
                <div
                  key={file}
                  className={`flex cursor-pointer items-center justify-between rounded-md border p-3 hover:bg-gray-50 ${
                    selectedFile === file ? "border-teal-500 bg-teal-50" : ""
                  }`}
                  onClick={() => handleSelectFile(file)}
                >
                  <div className="flex items-center gap-3">
                    <img src="/placeholder.svg?height=24&width=24" alt="Google Sheets" className="h-6 w-6" />
                    <span>{file}</span>
                  </div>
                  {selectedFile === file && <Check className="h-4 w-4 text-teal-600" />}
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t">
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => {
                document.getElementById("Google Sheets-modal")?.classList.add("hidden")
                if (selectedFile) {
                  onFileSelected(selectedFile)
                }
              }}
              disabled={!selectedFile}
            >
              Import Selected File
            </Button>
          </CardFooter>
        </Card>
      </div>

      {connectedServices.length > 0 && !selectedFile && (
        <div className="rounded-md bg-blue-50 p-4 text-center text-sm text-blue-700">
          You have connected {connectedServices.length} service(s). Click &quot;Select Files&quot; to choose a file to
          import.
        </div>
      )}

      {selectedFile && (
        <div className="rounded-md bg-green-50 p-4 text-center text-sm text-green-700">
          Selected file: <strong>{selectedFile}</strong>. Click &quot;Continue&quot; to proceed with analysis.
        </div>
      )}
    </div>
  )
}
