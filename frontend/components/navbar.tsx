"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-teal-600">Giraph</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors">
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors"
          >
            How It Works
          </Link>
          <Link href="#use-cases" className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors">
            Use Cases
          </Link>
          <Link href="/login" passHref>
            <Button variant="outline" className="text-teal-600 border-teal-600 hover:bg-teal-50">
              Log In
            </Button>
          </Link>
          <Link href="/signup" passHref>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">Try for Free</Button>
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button className="md:hidden p-2 rounded-md" onClick={toggleMenu} aria-label="Toggle menu">
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
          <div className="flex flex-col p-4 space-y-4">
            <Link
              href="#features"
              className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="#use-cases"
              className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Use Cases
            </Link>
            <div className="flex flex-col gap-2 pt-2">
              <Link href="/login" passHref>
                <Button variant="outline" className="w-full text-teal-600 border-teal-600 hover:bg-teal-50" onClick={() => setIsMenuOpen(false)}>
                  Log In
                </Button>
              </Link>
              <Link href="/signup" passHref>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setIsMenuOpen(false)}>Try for Free</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
