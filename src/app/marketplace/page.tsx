import { MarketplaceBoard } from "@/components/marketplace-board";

export const metadata = { title: "Marketplace Gamer | LogHorizon" };

export default function MarketplacePage() {
  return <MarketplaceBoard realtimeUrl={process.env.NEON_REALTIME_URL ?? ""} />;
}
