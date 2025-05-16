import type React from "react"
import Link from "next/link"
import { BarChart, PieChart, LineChart } from "lucide-react"
import { Logo } from "@/components/logo"

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
  image?: string
}

export function AuthLayout({ children, title, subtitle, image }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-900 md:flex-row">
      {/* Left side - Image (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-900 to-gray-800 items-center justify-center p-8">
        <div className="max-w-md">
          <div className="flex flex-col items-center space-y-8">
            <h2 className="text-3xl font-bold text-white mb-4">Data Insights at the Speed of Thought</h2>
            <p className="text-gray-300 text-center mb-8">
              Transform your raw data into actionable insights instantly with advanced analytics.
            </p>
            
            <div className="grid grid-cols-3 gap-6 mt-8">
              <div className="flex flex-col items-center">
                <div className="h-20 w-20 rounded-full bg-blue-800/50 flex items-center justify-center mb-3">
                  <BarChart size={36} className="text-blue-400" />
                </div>
                <span className="text-gray-300 text-sm">Data Visualization</span>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="h-20 w-20 rounded-full bg-blue-800/50 flex items-center justify-center mb-3">
                  <PieChart size={36} className="text-blue-400" />
                </div>
                <span className="text-gray-300 text-sm">Insights</span>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="h-20 w-20 rounded-full bg-blue-800/50 flex items-center justify-center mb-3">
                  <LineChart size={36} className="text-blue-400" />
                </div>
                <span className="text-gray-300 text-sm">Analytics</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-8 md:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Logo size="lg" />
          </div>

          <div className="rounded-xl bg-gray-800 border border-gray-700 p-6 shadow-md sm:p-8">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
              <p className="mt-2 text-gray-300">{subtitle}</p>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
