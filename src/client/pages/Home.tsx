import {
  EstimateSection,
  Faq,
  FinancingCallout,
  Hero,
  ServiceArea,
  ServicesGrid,
  TrustAndReviews,
} from "../components/sections";

export function HomePage() {
  return (
    <>
      <Hero />
      <ServicesGrid />
      <ServiceArea />
      <FinancingCallout />
      <TrustAndReviews />
      <EstimateSection />
      <Faq />
    </>
  );
}
