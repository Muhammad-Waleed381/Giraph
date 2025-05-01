"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Briefcase, BarChart, DollarSign, ShoppingBag, GraduationCap } from "lucide-react"

export function TargetAudienceSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const { current } = scrollContainerRef
      const scrollAmount = 300

      if (direction === "left") {
        current.scrollBy({ left: -scrollAmount, behavior: "smooth" })
      } else {
        current.scrollBy({ left: scrollAmount, behavior: "smooth" })
      }
    }
  }

  const audiences = [
    {
      icon: <Briefcase className="h-8 w-8 text-teal-600" />,
      title: "Small Business Owners",
      description: "Track revenue, inventory, customers.",
    },
    {
      icon: <BarChart className="h-8 w-8 text-teal-600" />,
      title: "Marketers & Agencies",
      description: "Analyze campaigns and customer behavior.",
    },
    {
      icon: <DollarSign className="h-8 w-8 text-teal-600" />,
      title: "Finance Professionals",
      description: "Understand trends, budgets, and ROI.",
    },
    {
      icon: <ShoppingBag className="h-8 w-8 text-teal-600" />,
      title: "Ecommerce Owners",
      description: "Discover sales patterns and top products.",
    },
    {
      icon: <GraduationCap className="h-8 w-8 text-teal-600" />,
      title: "Educators/Researchers",
      description: "Turn raw data into research-ready visuals.",
    },
  ]

  return (
    <section id="use-cases" className="py-20 bg-white">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-gray-900">
              Who Uses Giraph?
            </h2>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl">
              Powerful insights for teams across all industries.
            </p>
          </div>
        </div>

        <div className="relative mt-12">
          {/* Scroll buttons (hidden on mobile) */}
          <div className="absolute -left-4 top-1/2 hidden -translate-y-1/2 md:block">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full border-gray-200 bg-white shadow-sm"
              onClick={() => scroll("left")}
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Scroll left</span>
            </Button>
          </div>

          <div className="absolute -right-4 top-1/2 hidden -translate-y-1/2 md:block">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full border-gray-200 bg-white shadow-sm"
              onClick={() => scroll("right")}
            >
              <ChevronRight className="h-5 w-5" />
              <span className="sr-only">Scroll right</span>
            </Button>
          </div>

          {/* Scrollable container */}
          <div ref={scrollContainerRef} className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {audiences.map((audience, index) => (
              <div
                key={index}
                className="flex-shrink-0 snap-start scroll-ml-4 w-[280px] rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 rounded-full bg-teal-50 p-2 w-fit">{audience.icon}</div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">{audience.title}</h3>
                <p className="text-gray-500">{audience.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
