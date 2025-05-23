"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, LogOut, LayoutDashboard } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { Logo } from "@/components/logo"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { isAuthenticated, user, logout, isLoading } = useAuth()
  const { theme } = useTheme()

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const UserAvatar = () => {
    if (!user) return null
    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U'
    return (
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.profile_picture} alt={user.first_name || 'User'} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
    )
  }

  const renderAuthSection = () => {
    if (isLoading) {
      return <Button variant="ghost" disabled className="w-24 h-9"></Button>
    }
    if (isAuthenticated && user) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <UserAvatar />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.first_name} {user.last_name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    } else {
      return (
        <>
          <Link href="/login" passHref>
            <Button variant="outline" className="text-blue-400 border-blue-500 hover:bg-blue-900/30">
              Log In
            </Button>
          </Link>
          <Link href="/signup" passHref>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Try for Free</Button>
          </Link>
        </>
      )
    }
  }
  
  const renderMobileAuthSection = () => {
    if (isLoading) {
      return null
    }
    if (isAuthenticated && user) {
      return (
        <>
          <div className="flex items-center gap-2 border-b pb-3 mb-3 border-gray-700">
            <UserAvatar />
            <div>
              <p className="text-sm font-medium">{user.first_name} {user.last_name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Link href="/dashboard" className="flex items-center text-sm font-medium text-gray-300 hover:text-blue-400 transition-colors" onClick={() => setIsMenuOpen(false)}>
            <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
          </Link>
          <Button variant="ghost" className="w-full justify-start text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 mt-2" onClick={async () => { await logout(); setIsMenuOpen(false); }}>
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </Button>
        </>
      )
    } else {
      return (
        <>
          <Link href="/login" passHref>
            <Button variant="outline" className="w-full text-blue-400 border-blue-500 hover:bg-blue-900/30" onClick={() => setIsMenuOpen(false)}>
              Log In
            </Button>
          </Link>
          <Link href="/signup" passHref>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsMenuOpen(false)}>Try for Free</Button>
          </Link>
        </>
      )
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background backdrop-blur-md dark:bg-gray-900/80 dark:border-gray-800/40">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Logo />
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="#features" className="text-sm font-medium text-gray-300 hover:text-blue-400 transition-colors">
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm font-medium text-gray-300 hover:text-blue-400 transition-colors"
          >
            How It Works
          </Link>
          <Link href="#use-cases" className="text-sm font-medium text-gray-300 hover:text-blue-400 transition-colors">
            Use Cases
          </Link>
          {renderAuthSection()}
        </nav>

        <div className="md:hidden flex items-center">
          {isAuthenticated && !isMenuOpen && !isLoading && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <UserAvatar />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {(!isAuthenticated || isMenuOpen || isLoading) && (
            <button className="p-2 rounded-md text-gray-300" onClick={toggleMenu} aria-label="Toggle menu">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-gray-900 border-b border-gray-800 shadow-lg z-50">
          <div className="flex flex-col p-4 space-y-4">
            {renderMobileAuthSection()}
            <Link
              href="#features"
              className="text-sm font-medium text-gray-300 hover:text-blue-400 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-gray-300 hover:text-blue-400 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="#use-cases"
              className="text-sm font-medium text-gray-300 hover:text-blue-400 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Use Cases
            </Link>
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-700 mt-2">
              {!(isAuthenticated || isLoading) && renderMobileAuthSection()}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
