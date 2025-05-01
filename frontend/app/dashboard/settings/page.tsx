import { DashboardHeader } from "@/components/dashboard/header"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100">
              <span className="text-xl text-teal-600">⚙️</span>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Manage your account and application preferences.</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">Settings Coming Soon</h3>
          <p className="mt-2 text-sm text-gray-500">
            This section is under development. Check back soon for account and application settings.
          </p>
        </div>
      </main>
    </div>
  )
}
