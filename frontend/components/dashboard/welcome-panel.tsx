"use client"

import { useState, useEffect } from "react"
import { WavesIcon as Wave } from "lucide-react"

interface WelcomePanelProps {
  userName?: string
}

export function WelcomePanel({ userName: propUserName }: WelcomePanelProps) {
  const [userName, setUserName] = useState(propUserName || "")

  // Get user name from local storage if not provided as prop
  useEffect(() => {
    if (!propUserName) {
      // Get from localStorage or API call
      const storedUser = localStorage.getItem("giraphUser")
      if (storedUser) {
        try {
          const userInfo = JSON.parse(storedUser)
          setUserName(userInfo.name || userInfo.userName || "there")
        } catch (e) {
          setUserName("there")
        }
      }
    }
  }, [propUserName])

  // Get current time to display appropriate greeting
  const currentHour = new Date().getHours()
  let greeting = "Good morning"

  if (currentHour >= 12 && currentHour < 18) {
    greeting = "Good afternoon"
  } else if (currentHour >= 18) {
    greeting = "Good evening"
  }

  return (
    <div className="mb-8 rounded-xl bg-gray-800 border border-gray-700 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-900/50">
          <Wave className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {greeting}, {userName || "there"}!
          </h1>
          <p className="text-gray-300">Let&apos;s get some insights from your data today.</p>
        </div>
      </div>
    </div>
  )
}
