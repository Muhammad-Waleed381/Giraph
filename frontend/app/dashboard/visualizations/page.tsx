"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function VisualizationsRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace("/visualizations")
  }, [router])

  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Redirecting to new visualizations page...</p>
      </div>
    </div>
  )
}
