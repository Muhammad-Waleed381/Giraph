import type React from "react"
import Link from "next/link"

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
  image?: string
}

export function AuthLayout({ children, title, subtitle, image }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row">
      {/* Left side - Image (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-teal-600 items-center justify-center p-8">
        <div className="max-w-md">
          {image ? (
            <div className="relative">
              <img src={image || "/placeholder.svg"} alt="Giraph Dashboard" className="rounded-xl shadow-2xl" />
              <div className="absolute -bottom-6 -right-6 h-16 w-16 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                AI-Powered
              </div>
            </div>
          ) : (
            <div className="text-white text-center">
              <h2 className="text-3xl font-bold mb-4">Turn data into decisions</h2>
              <p className="text-white/80">
                Giraph helps you transform raw data into beautiful, insightful dashboards in seconds.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-8 md:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link href="/" className="inline-block">
              <span className="text-2xl font-bold text-teal-600">Giraph</span>
            </Link>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-md sm:p-8">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
              <p className="mt-2 text-gray-600">{subtitle}</p>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
