import "server-only";

import { createRealtime } from "@neon/realtime/server";

let realtime: ReturnType<typeof createRealtime> | undefined;

export function getRealtime() {
  const secret = process.env.NEON_REALTIME_SECRET;
  if (!secret) throw new Error("NEON_REALTIME_SECRET belum dikonfigurasi.");
  return (realtime ??= createRealtime({ secret, db: "neondb" }));
}
