export function TrustedBySection() {
  const logos = [
    { name: "Small Businesses", width: 120 },
    { name: "Agencies", width: 140 },
    { name: "Ecommerce Stores", width: 160 },
    { name: "Finance Teams", width: 130 },
  ]

  return (
    <section className="py-12 bg-gray-50">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-8">
          <h2 className="text-center text-sm font-medium uppercase tracking-wider text-gray-500">
            Trusted by teams from
          </h2>
          <div className="flex flex-wrap justify-center gap-8 md:gap-12">
            {logos.map((logo, index) => (
              <div
                key={index}
                className="flex h-12 items-center justify-center rounded-lg bg-white px-6 shadow-sm"
                style={{ width: logo.width }}
              >
                <span className="text-gray-400 font-medium">{logo.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
