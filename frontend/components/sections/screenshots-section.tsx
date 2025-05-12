"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function ScreenshotsSection() {
  const [activeIndex, setActiveIndex] = useState(0)

  const screenshots = [
    {
      title: "AI-Generated Dashboard",
      description: "Upload your data and get beautiful visualizations instantly.",
      image: "/Sample1.jpeg?height=720&width=1280",
    },
    {
      title: "Natural Language Queries",
      description: "Ask questions in plain English and get instant insights.",
      image: "/Sample2.jpg?height=720&width=1280",
    },
    {
      title: "Mobile-Friendly View",
      description: "Access your dashboards on any device, anywhere.",
      image: "/Mobile.jpeg?height=720&width=1280",
    },
  ]

  const nextSlide = () => {
    setActiveIndex((current) => (current === screenshots.length - 1 ? 0 : current + 1))
  }

  const prevSlide = () => {
    setActiveIndex((current) => (current === 0 ? screenshots.length - 1 : current - 1))
  }

  return (
    <section className="py-20 bg-gray-50">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-gray-900">
              See Giraph in Action
            </h2>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl">
              Powerful visualizations that bring your data to life.
            </p>
          </div>
        </div>

        <div className="mt-12 relative">
          <div className="overflow-hidden rounded-2xl shadow-2xl">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {screenshots.map((screenshot, index) => (
                <div key={index} className="w-full flex-shrink-0">
                  <div className="relative">
                    <img
                      src={screenshot.image || "/placeholder.svg"}
                      alt={screenshot.title}
                      className="w-full aspect-[16/9] object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white">
                      <h3 className="text-2xl font-bold">{screenshot.title}</h3>
                      <p className="mt-2 text-white/80">{screenshot.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          <Button
            variant="outline"
            size="icon"
            className="absolute -left-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border-gray-200 bg-white shadow-sm md:-left-5"
            onClick={prevSlide}
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Previous slide</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="absolute -right-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border-gray-200 bg-white shadow-sm md:-right-5"
            onClick={nextSlide}
          >
            <ChevronRight className="h-5 w-5" />
            <span className="sr-only">Next slide</span>
          </Button>

          {/* Indicators */}
          <div className="mt-6 flex justify-center space-x-2">
            {screenshots.map((_, index) => (
              <button
                key={index}
                className={`h-2 w-2 rounded-full ${index === activeIndex ? "bg-teal-600" : "bg-gray-300"}`}
                onClick={() => setActiveIndex(index)}
              >
                <span className="sr-only">Go to slide {index + 1}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
