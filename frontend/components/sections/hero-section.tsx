"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-teal-50 py-20 md:py-32">
      <div className="container px-4 md:px-6">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16 items-center">
          <div
            className={`space-y-6 transition-all duration-700 ease-in-out ${isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
          >
            <div className="inline-block rounded-full bg-teal-100 px-3 py-1 text-sm font-medium text-teal-800">
              AI-Powered Analytics
            </div>
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-gray-900">
              Turn Your Raw Data into Beautiful Dashboards – Instantly with AI
            </h1>
            <p className="text-lg text-gray-600 md:text-xl">
              No code. No Excel formulas. Just upload your data and get insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg px-6 py-3 shadow-lg hover:shadow-xl transition-all group"
              >
                Start Analyzing Your Data
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-teal-600 text-teal-600 hover:bg-teal-50 font-medium rounded-lg px-6 py-3"
              >
                Watch Demo
              </Button>
            </div>
          </div>
          <div
            className={`relative transition-all duration-700 delay-300 ease-in-out ${isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
          >
            <div className="relative rounded-2xl bg-white p-2 shadow-2xl border border-gray-200">
              <div className="aspect-[16/9] overflow-hidden rounded-xl bg-gray-100">
                <img
                  src="/Dashboard_Preview.jpeg?height=720&width=1280"
                  alt="Giraph Dashboard Preview"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-orange-500 flex items-center justify-center text-center text-white font-bold text-lg shadow-lg">
                AI-Powered
              </div>
            </div>
            <div className="absolute -z-10 h-full w-full rounded-[inherit] bg-gradient-to-r from-teal-500 to-blue-500 blur-2xl opacity-20"></div>
          </div>
        </div>
      </div>
    </section>
  )
}
