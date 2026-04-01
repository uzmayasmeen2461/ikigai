import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { Services } from "../components/Services";
import { HowItWorks } from "../components/HowItWorks";
import { Pricing } from "../components/Pricing";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Services />
      <HowItWorks />
      <Pricing />
    </main>
  );
}