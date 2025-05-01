import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CtaSection() {
  return (
    <section className="py-20 bg-gradient-to-r from-teal-600 to-blue-600 text-white">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Ready to Transform Your Data?
            </h2>
            <p className="mx-auto max-w-[700px] text-white/80 md:text-xl">
              No code. No manual charts. Just upload and go.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <Button
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg px-6 py-3 shadow-lg hover:shadow-xl transition-all group"
            >
              Try Giraph for Free
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10 font-medium rounded-lg px-6 py-3"
            >
              Schedule a Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
