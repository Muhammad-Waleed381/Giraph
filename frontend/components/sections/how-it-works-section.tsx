import { FileSpreadsheet, LineChart, Lightbulb } from "lucide-react"

export function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      icon: <FileSpreadsheet className="h-10 w-10 text-white" />,
      title: "Upload Data",
      description: "CSV, Excel, Google Sheets - we handle them all.",
    },
    {
      number: "02",
      icon: <LineChart className="h-10 w-10 text-white" />,
      title: "Let AI Do the Work",
      description: "Charts, trends, and summaries generated instantly.",
    },
    {
      number: "03",
      icon: <Lightbulb className="h-10 w-10 text-white" />,
      title: "Get Insights & Take Action",
      description: "Download, customize, or ask follow-up questions.",
    },
  ]

  return (
    <section id="how-it-works" className="py-20 bg-gray-900">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-white">How It Works</h2>
            <p className="mx-auto max-w-[700px] text-gray-300 md:text-xl">
              Three simple steps to transform your data into actionable insights.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3 mt-16">
          {steps.map((step, index) => (
            <div key={index} className="relative flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-700 shadow-lg">
                  {step.icon}
                </div>
                <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                  {step.number}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">{step.title}</h3>
              <p className="text-center text-gray-300">{step.description}</p>

              {/* Connector line between steps (hidden on mobile) */}
              {index < steps.length - 1 && (
                <div className="absolute right-[-30%] top-10 hidden w-[60%] border-t-2 border-dashed border-blue-600 md:block"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
