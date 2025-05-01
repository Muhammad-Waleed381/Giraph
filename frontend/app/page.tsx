import { HeroSection } from "@/components/sections/hero-section"
import { TrustedBySection } from "@/components/sections/trusted-by-section"
import { ValuePropositionSection } from "@/components/sections/value-proposition-section"
import { HowItWorksSection } from "@/components/sections/how-it-works-section"
import { TargetAudienceSection } from "@/components/sections/target-audience-section"
import { ScreenshotsSection } from "@/components/sections/screenshots-section"
import { TestimonialsSection } from "@/components/sections/testimonials-section"
import { CtaSection } from "@/components/sections/cta-section"
import { Footer } from "@/components/sections/footer"
import { Navbar } from "@/components/navbar"

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <HeroSection />
        <TrustedBySection />
        <ValuePropositionSection />
        <HowItWorksSection />
        <TargetAudienceSection />
        <ScreenshotsSection />
        <TestimonialsSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  )
}
