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
  ChevronLeft,
  ChevronRight,
  PanelRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"

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
      <div className="flex min-h-screen bg-gray-900">
        <MainSidebar />
        <div className="flex-1">{children}</div>
      </div>
    </SidebarProvider>
  )
}

function MainSidebar() {
  const pathname = usePathname()
  const { state, toggleSidebar } = useSidebar()
  const { user } = useAuth() // Get user from context

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
      href: "/visualizations",
    },
    {
      title: "Settings",
      icon: <Settings className="h-5 w-5" />,
      href: "/dashboard/settings",
    },
  ]

  return (
    <>
      <Sidebar className="border-r border-gray-800 bg-gray-800">
        <SidebarHeader className="border-b border-gray-700 px-3 py-4">
          <div className="flex items-center justify-between">
            {state === "expanded" ? (
              <Logo showText size="md" />
            ) : (
              <Logo showText={false} size="sm" />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-gray-300 hover:text-white hover:bg-gray-700"
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
                  className={cn(
                    "text-gray-300 hover:text-white hover:bg-gray-700",
                    pathname === item.href && "bg-blue-900/50 text-blue-400"
                  )}
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

        <SidebarFooter className="border-t border-gray-700 px-3 py-4">
          <div className="flex items-center justify-center">
            <span className="text-xs text-gray-400">
              © {new Date().getFullYear()} Giraph Analytics
            </span>
          </div>
        </SidebarFooter>
      </Sidebar>
      
      {/* Floating button to reopen sidebar when collapsed */}
      {state === "collapsed" && (
        <div className="fixed left-0 top-1/2 z-20 -translate-y-1/2 md:block">
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 rounded-r-lg rounded-l-none bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 shadow-md"
            onClick={toggleSidebar}
            aria-label="Open sidebar"
          >
            <PanelRight className="h-5 w-5" />
          </Button>
        </div>
      )}
    </>
  )
}
