"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/AuthContext" // Import useAuth
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Link2,
  MessageSquare,
  Zap,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function DashboardSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)

  // Wait until mounted to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <>{children}</>
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen">
        <MainSidebar />
        <div className="flex-1">{children}</div>
      </div>
    </SidebarProvider>
  )
}

function MainSidebar() {
  const pathname = usePathname()
  const { state, toggleSidebar } = useSidebar()
  const { user, logout, isLoading } = useAuth() // Get user and logout from context

  const navItems = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      href: "/dashboard",
    },
    {
      title: "Connect Data",
      icon: <Link2 className="h-5 w-5" />,
      href: "/dashboard/connect",
    },
    {
      title: "Ask Questions",
      icon: <MessageSquare className="h-5 w-5" />,
      href: "/dashboard/ask",
    },
    {
      title: "Auto Insights",
      icon: <Zap className="h-5 w-5" />,
      href: "/dashboard/insights",
    },
    {
      title: "Visualizations",
      icon: <BarChart3 className="h-5 w-5" />,
      href: "/dashboard/visualizations",
    },
    {
      title: "Settings",
      icon: <Settings className="h-5 w-5" />,
      href: "/dashboard/settings",
    },
  ]

  const handleLogout = async () => {
    await logout();
    // Redirection is handled within the logout function in AuthContext
  }

  // Function to get initials from name
  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="border-b border-gray-200 px-3 py-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            {state === "expanded" ? (
              <span className="text-xl font-bold text-teal-600">Giraph</span>
            ) : (
              <span className="text-xl font-bold text-teal-600">G</span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={toggleSidebar}
            aria-label={state === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
          >
            {state === "expanded" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={state === "collapsed" ? item.title : undefined}
              >
                <Link href={item.href} className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200 px-3 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder-user.jpg" alt={user?.name || "User"} />
            <AvatarFallback className="bg-teal-100 text-teal-800">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          {state === "expanded" && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{user?.name || "User"}</p>
              <p className="truncate text-xs text-gray-500">{user?.email || ""}</p>
            </div>
          )}
        </div>

        {state === "expanded" && (
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              <HelpCircle className="mr-1 h-4 w-4" />
              Help
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleLogout} // Call handleLogout on click
              disabled={isLoading} // Disable button while logging out
            >
              <LogOut className="mr-1 h-4 w-4" />
              {isLoading ? "Logging out..." : "Logout"}
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
