import { ForumBoard } from "@/components/forum-board";

export const metadata = { title: "Forum Komunitas | LogHorizon" };

export default function ForumPage() {
  return <ForumBoard realtimeUrl={process.env.NEON_REALTIME_URL ?? ""} />;
}
