import { Database, BarChart3, Clock, LineChart } from "lucide-react"

export function StatsCards() {
  const stats = [
    {
      title: "Total Collections",
      value: "12",
      icon: <Database className="h-5 w-5 text-teal-600" />,
      description: "Data sources uploaded",
    },
    {
      title: "Total Visualizations",
      value: "48",
      icon: <BarChart3 className="h-5 w-5 text-teal-600" />,
      description: "Charts generated",
    },
    {
      title: "Last Active",
      value: "2 days ago",
      icon: <Clock className="h-5 w-5 text-teal-600" />,
      description: "May 1, 2023",
    },
    {
      title: "Active Dashboards",
      value: "5",
      icon: <LineChart className="h-5 w-5 text-teal-600" />,
      description: "Saved dashboards",
    },
  ]

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <div key={index} className="rounded-xl bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.title}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="mt-1 text-xs text-gray-500">{stat.description}</p>
            </div>
            <div className="rounded-full bg-teal-50 p-3">{stat.icon}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
