import { Star } from "lucide-react"

export function TestimonialsSection() {
  const testimonials = [
    {
      quote: "Giraph transformed our analytics workflow. We used to spend days creating reports, now it takes minutes. The AI-powered insights have been a game-changer for our team.",
      author: "Sarah Johnson",
      position: "Data Analytics Lead",
      company: "TechNova Inc.",
      stars: 5
    },
    {
      quote: "The ability to ask natural language questions and get immediate visual answers has revolutionized how our marketing team understands campaign performance.",
      author: "Michael Chen",
      position: "Marketing Director",
      company: "Growth Metrics",
      stars: 5
    },
    {
      quote: "As someone without a technical background, Giraph has empowered me to extract meaningful insights from our company data without relying on our data science team.",
      author: "Alex Rivera",
      position: "Operations Manager",
      company: "Elevate Retail",
      stars: 4
    }
  ]

  return (
    <section className="py-20 bg-gray-900">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-white">
              Success Stories
            </h2>
            <p className="mx-auto max-w-[700px] text-gray-300 md:text-xl">
              See how teams are transforming their data with Giraph.
            </p>
          </div>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="rounded-xl border border-gray-700 bg-gray-800 p-8 shadow-md">
              <div className="flex mb-4">
                {Array(testimonial.stars).fill(0).map((_, i) => (
                  <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-300 italic mb-6">
                "{testimonial.quote}"
              </p>
              <div className="mt-6 flex items-center">
                <div className="h-12 w-12 rounded-full bg-blue-900 flex items-center justify-center text-blue-300 font-bold">
                  {testimonial.author.split(' ').map(name => name[0]).join('')}
                </div>
                <div className="ml-4 text-left">
                  <p className="font-medium text-white">{testimonial.author}</p>
                  <p className="text-sm text-gray-400">{testimonial.position}, {testimonial.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
