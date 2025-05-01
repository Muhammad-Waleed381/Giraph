import { WavesIcon as Wave } from "lucide-react"

interface WelcomePanelProps {
  userName: string
}

export function WelcomePanel({ userName }: WelcomePanelProps) {
  // Get current time to display appropriate greeting
  const currentHour = new Date().getHours()
  let greeting = "Good morning"

  if (currentHour >= 12 && currentHour < 18) {
    greeting = "Good afternoon"
  } else if (currentHour >= 18) {
    greeting = "Good evening"
  }

  return (
    <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100">
          <Wave className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {userName}!
          </h1>
          <p className="text-gray-600">Let&apos;s get some insights from your data today.</p>
        </div>
      </div>
    </div>
  )
}
