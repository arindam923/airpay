import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Paylinks from "@/components/Paylinks";
import Faq from "@/components/Faq";
import Api from "@/components/Api";
import Reliability from "@/components/Reliability";
import Cta from "@/components/Cta";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Paylinks />
        <Faq />
        <Api />
        <Reliability />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
