import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireStaff();
  if (access.response) {
    return Response.json({ pendingCount: 0 });
  }

  try {
    const [pendingDonations, pendingTournaments, pendingReports] = await Promise.all([
      prisma.donation.count({ where: { status: "PENDING" } }),
      prisma.participant.count({ where: { paymentStatus: "PENDING_PAYMENT" } }),
      prisma.report.count({ where: { status: "PENDING" } }),
    ]);

    const pendingCount = pendingDonations + pendingTournaments + pendingReports;
    return Response.json({ pendingCount });
  } catch (err) {
    console.error("[admin-pending-count] Error fetching count:", err);
    return Response.json({ pendingCount: 0 });
  }
}
