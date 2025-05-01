import { Link2 } from "lucide-react"

export function ConnectHeader() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100">
          <Link2 className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🔗 Connect Your Data</h1>
          <p className="text-gray-600">Choose how you&apos;d like to bring your data into Giraph.</p>
        </div>
      </div>
    </div>
  )
}
