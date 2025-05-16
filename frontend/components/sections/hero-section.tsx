"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, BarChart, PieChart, LineChart } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800 py-20 md:py-32">
      <div className="container px-4 md:px-6">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16 items-center">
          <div
            className={`space-y-6 transition-all duration-700 ease-in-out ${isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
          >
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-white">
              Turn Your Raw Data into Beautiful Dashboards – Instantly
            </h1>
            <p className="text-lg text-gray-300 md:text-xl">
              No code. No Excel formulas. Just upload your data and get insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-6 py-3 shadow-lg hover:shadow-xl transition-all group w-full"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
          <div
            className={`relative transition-all duration-700 delay-300 ease-in-out ${isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
          >
            <div className="relative rounded-2xl bg-gray-800 p-6 shadow-2xl border border-gray-700">
              <div className="aspect-[16/9] overflow-hidden rounded-xl bg-gray-900 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 p-4 w-full">
                  <div className="bg-gray-800 p-4 rounded-lg flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-blue-400 font-medium">Revenue</span>
                      <span className="text-green-400">+24%</span>
                    </div>
                    <div className="h-32 flex items-end space-x-2">
                      {[40, 70, 55, 90, 60, 80, 95].map((height, i) => (
                        <div key={i} className="flex-1">
                          <div 
                            className="bg-blue-600 rounded-t-sm" 
                            style={{ height: `${height}%` }}
                          ></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-blue-400 font-medium">Segments</span>
                    </div>
                    <div className="flex justify-center">
                      <div className="relative h-32 w-32">
                        <PieChart size={128} className="text-blue-500" strokeWidth={1} />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg col-span-2">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-blue-400 font-medium">Trends</span>
                      <LineChart size={20} className="text-blue-400" />
                    </div>
                    <div className="h-24 flex items-end space-x-1 pt-2">
                      <div className="relative w-full h-full">
                        <svg viewBox="0 0 100 20" className="w-full h-full">
                          <path
                            d="M0,10 Q30,5 50,10 T100,10"
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="0.5"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -z-10 h-full w-full rounded-[inherit] bg-gradient-to-r from-blue-600 to-blue-800 blur-2xl opacity-20"></div>
          </div>
        </div>
      </div>
    </section>
  )
}
