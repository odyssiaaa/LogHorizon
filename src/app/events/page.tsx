import { Suspense } from "react";
import { EventsBoard } from "@/components/events-board";

export const metadata = { title: "Events & Party Finder | LogHorizon" };
export const instant = false;

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="page-shell py-12 text-center text-sm text-gray-400">Memuat event...</div>}>
      <EventsBoard />
    </Suspense>
  );
}
