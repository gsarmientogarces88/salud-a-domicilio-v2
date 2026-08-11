import {
  TopBar,
  Navbar,
  UrgencyBanner,
  Hero,
  Stats,
  Services,
  NearbyDoctors,
  HowItWorks,
  Trust,
  Payments,
  Footer,
} from '@/components/landing';

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-[#0B3A6E]">
      <TopBar />
      <Navbar />
      <UrgencyBanner />
      <Hero />
      <Stats />
      <Services />
      <NearbyDoctors />
      <HowItWorks />
      <Trust />
      <Payments />
      <Footer />
    </main>
  );
}
