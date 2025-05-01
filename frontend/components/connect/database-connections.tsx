"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Database, Lock, Server, PiIcon as ApiIcon, CheckCircle, AlertCircle } from "lucide-react"

interface DatabaseConnectionsProps {
  onConnected: () => void
}

export function DatabaseConnections({ onConnected }: DatabaseConnectionsProps) {
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [useSSL, setUseSSL] = useState(true)
  const [formData, setFormData] = useState({
    host: "",
    port: "",
    database: "",
    username: "",
    password: "",
    apiUrl: "",
    apiKey: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleTestConnection = () => {
    setConnectionStatus("testing")

    // Simulate connection test
    setTimeout(() => {
      // For demo purposes, succeed if host is filled
      if (formData.host || formData.apiUrl) {
        setConnectionStatus("success")
      } else {
        setConnectionStatus("error")
      }
    }, 1500)
  }

  const handleSaveConnection = () => {
    // Simulate saving connection
    setTimeout(() => {
      onConnected()
    }, 500)
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="sql" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="sql" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>SQL Databases</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <ApiIcon className="h-4 w-4" />
            <span>REST API / Webhook</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sql">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Database Connection
              </CardTitle>
              <CardDescription>Connect to MySQL, PostgreSQL, or MongoDB databases</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="host">Host</Label>
                  <Input
                    id="host"
                    name="host"
                    placeholder="e.g., db.example.com"
                    value={formData.host}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    name="port"
                    placeholder="e.g., 3306"
                    value={formData.port}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="database">Database Name</Label>
                <Input
                  id="database"
                  name="database"
                  placeholder="e.g., my_database"
                  value={formData.database}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    placeholder="Database username"
                    value={formData.username}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    <div className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Password
                    </div>
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="ssl" checked={useSSL} onCheckedChange={setUseSSL} />
                <Label htmlFor="ssl">Use SSL connection</Label>
              </div>

              <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                <p className="flex items-center gap-1">
                  <Lock className="h-4 w-4" />
                  Your connection details are encrypted and securely stored.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t px-6 py-4">
              <div>
                {connectionStatus === "success" && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Connection successful!
                  </div>
                )}
                {connectionStatus === "error" && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    Connection failed. Please check your details.
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleTestConnection} disabled={connectionStatus === "testing"}>
                  {connectionStatus === "testing" ? "Testing..." : "Test Connection"}
                </Button>
                <Button
                  className="bg-teal-600 hover:bg-teal-700"
                  disabled={connectionStatus !== "success"}
                  onClick={handleSaveConnection}
                >
                  Save Connection
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ApiIcon className="h-5 w-5" />
                API Connection
              </CardTitle>
              <CardDescription>Connect to a REST API endpoint or webhook</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiUrl">API URL</Label>
                <Input
                  id="apiUrl"
                  name="apiUrl"
                  placeholder="https://api.example.com/data"
                  value={formData.apiUrl}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">
                  <div className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    API Key
                  </div>
                </Label>
                <Input
                  id="apiKey"
                  name="apiKey"
                  type="password"
                  placeholder="Enter your API key"
                  value={formData.apiKey}
                  onChange={handleInputChange}
                />
              </div>

              <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                <p className="flex items-center gap-1">
                  <Lock className="h-4 w-4" />
                  Your API credentials are encrypted and securely stored.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t px-6 py-4">
              <div>
                {connectionStatus === "success" && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    API connection successful!
                  </div>
                )}
                {connectionStatus === "error" && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    API connection failed. Please check your details.
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleTestConnection} disabled={connectionStatus === "testing"}>
                  {connectionStatus === "testing" ? "Testing..." : "Test Connection"}
                </Button>
                <Button
                  className="bg-teal-600 hover:bg-teal-700"
                  disabled={connectionStatus !== "success"}
                  onClick={handleSaveConnection}
                >
                  Save Connection
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
