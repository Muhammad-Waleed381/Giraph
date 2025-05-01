import { BarChart3, Brain, MessageSquare, Share2 } from "lucide-react"

export function ValuePropositionSection() {
  const features = [
    {
      icon: <Brain className="h-10 w-10 text-teal-600" />,
      title: "AI-Powered Dashboards",
      description: "Automatically create charts and summaries from your data.",
    },
    {
      icon: <BarChart3 className="h-10 w-10 text-teal-600" />,
      title: "No Tech Skills Needed",
      description: "Just upload your spreadsheet—Giraph handles the rest.",
    },
    {
      icon: <MessageSquare className="h-10 w-10 text-teal-600" />,
      title: "Ask Questions in English",
      description: 'Use natural language to get answers like "Top customers in 2023?"',
    },
    {
      icon: <Share2 className="h-10 w-10 text-teal-600" />,
      title: "Interactive & Shareable",
      description: "Export, customize, and share your dashboards easily.",
    },
  ]

  return (
    <section id="features" className="py-20 bg-white">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-gray-900">Why Giraph?</h2>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl">
              Transform your data into actionable insights without any technical expertise.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 mt-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex flex-col items-center space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className="rounded-full bg-teal-50 p-3">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-900">{feature.title}</h3>
              <p className="text-center text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
