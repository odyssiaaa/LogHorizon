import { DonationForm } from "@/components/donation-form";

export const metadata = { title: "Dukung Kas Komunitas — LogHorizon" };

export default function DonatePage() {
  return <DonationForm simulationEnabled={process.env.NODE_ENV === "development"} />;
}
