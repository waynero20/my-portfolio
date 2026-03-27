import { Hero } from "@/components/hero";
import { Projects } from "@/components/projects";
import { TechStack } from "@/components/tech-stack";
import { Contact } from "@/components/contact";

export default function Home() {
  return (
    <main className="relative">
      <Hero />
      <TechStack />
      <Projects />
      <Contact />
    </main>
  );
}
