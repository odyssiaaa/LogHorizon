import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { notifyPartnership } from "@/lib/discord-webhook";

export async function GET() {
  const sponsors = await prisma.sponsor.findMany({
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ sponsors });
}

export async function POST(request: Request) {
  const access = await requireStaff(["ADMIN"]);
  if (access.response) return access.response;

  const payload: unknown = await request.json();
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  let name = typeof body.name === "string" ? body.name.trim() : "";
  const logoUrl = typeof body.logoUrl === "string" ? body.logoUrl.trim() : null;
  let websiteUrl = typeof body.websiteUrl === "string" ? body.websiteUrl.trim() : null;
  const tier = typeof body.tier === "string" ? body.tier.trim() : "Official Sponsor";

  if (!logoUrl) {
    return Response.json({ error: "Logo sponsor wajib diunggah." }, { status: 400 });
  }

  if (websiteUrl && !websiteUrl.startsWith("http://") && !websiteUrl.startsWith("https://")) {
    websiteUrl = `https://${websiteUrl}`;
  }

  if (!name) {
    if (websiteUrl) {
      try {
        const u = new URL(websiteUrl);
        name = u.hostname.replace(/^www\./, "");
      } catch {
        name = "Official Partner";
      }
    } else {
      name = "Official Partner";
    }
  }

  const sponsor = await prisma.sponsor.create({
    data: {
      name,
      logoUrl: logoUrl || null,
      websiteUrl: websiteUrl || null,
      tier: tier || "Official Sponsor",
    },
  });

  void notifyPartnership({
    title: `Sponsor / Mitra Resmi Baru: ${name}`,
    sponsorOrMemberName: name,
    tierOrBadge: tier || "Official Partner",
    linkUrl: websiteUrl || undefined,
    description: `Komunitas LogHorizon menyambut kehadiran mitra sponsor baru **${name}** (${tier})! Kunjungi situs mereka untuk mendukung komunitas.`,
    logoUrl: logoUrl || undefined,
  }).catch(() => {});

  return Response.json({ success: true, sponsor, message: "Sponsor baru berhasil ditambahkan!" }, { status: 201 });
}
