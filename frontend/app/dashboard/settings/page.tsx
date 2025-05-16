"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Moon, Sun, BellRing, Database, User } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "next-themes"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [dataRetention, setDataRetention] = useState("30days")

  return (
    <div className="min-h-screen bg-gray-900">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-900">
              <span className="text-blue-400">⚙️</span>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-gray-400">Manage your account and application preferences</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-gray-800">
            <TabsTrigger value="general" className="data-[state=active]:bg-gray-700">General</TabsTrigger>
            <TabsTrigger value="account" className="data-[state=active]:bg-gray-700">Account</TabsTrigger>
            <TabsTrigger value="data" className="data-[state=active]:bg-gray-700">Data</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">General Settings</CardTitle>
                <CardDescription className="text-gray-400">
                  Configure your application preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Appearance</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Theme</Label>
                      <div className="text-sm text-gray-400">Choose your preferred theme</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant={theme === 'light' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setTheme('light')}
                        className="border-gray-700"
                      >
                        <Sun className="h-4 w-4 mr-1" />
                        Light
                      </Button>
                      <Button 
                        variant={theme === 'dark' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setTheme('dark')}
                        className="border-gray-700"
                      >
                        <Moon className="h-4 w-4 mr-1" />
                        Dark
                      </Button>
                    </div>
                  </div>
                </div>
                
                <Separator className="bg-gray-700" />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Notifications</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Email Notifications</Label>
                      <div className="text-sm text-gray-400">Receive updates about your data analysis</div>
                    </div>
                    <Switch 
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Push Notifications</Label>
                      <div className="text-sm text-gray-400">Get notified in the browser when insights are ready</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="account">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Account Settings</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your account details and security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Profile</h3>
                  <p className="text-gray-400">Configure your profile settings here</p>
                </div>
                
                <Button variant="outline" className="border-gray-700 text-white">
                  <User className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="data">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Data Settings</CardTitle>
                <CardDescription className="text-gray-400">
                  Configure how your data is stored and processed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Data Retention</h3>
                  
                  <RadioGroup value={dataRetention} onValueChange={setDataRetention}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="30days" id="r1" className="border-gray-600" />
                      <Label htmlFor="r1" className="text-white">Keep data for 30 days</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="90days" id="r2" className="border-gray-600" />
                      <Label htmlFor="r2" className="text-white">Keep data for 90 days</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="forever" id="r3" className="border-gray-600" />
                      <Label htmlFor="r3" className="text-white">Keep data indefinitely</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <Separator className="bg-gray-700" />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Data Processing</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Automatic Data Analysis</Label>
                      <div className="text-sm text-gray-400">Automatically analyze new data when uploaded</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Data Caching</Label>
                      <div className="text-sm text-gray-400">Cache processed data for faster access</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
        </div>
                
                <Button variant="outline" className="border-gray-700 text-white">
                  <Database className="h-4 w-4 mr-2" />
                  Manage Data Sources
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
