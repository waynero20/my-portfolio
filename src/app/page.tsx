import { Footer } from "@/components/layout/footer";
import { ContactSection } from "@/components/sections/contact/contact-section";
import { Hero } from "@/components/sections/hero";
import { ServicesSection } from "@/components/sections/services/services-section";
import { StackSection } from "@/components/sections/stack/stack-section";
import { WorkSection } from "@/components/sections/work/work-section";

// The page must stay static (○ /): no useSearchParams and no server searchParams.
export const dynamic = "force-static";

export default function Home() {
  return (
    <>
      <main id="main">
        <Hero />
        <WorkSection />
        <ServicesSection />
        <StackSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
