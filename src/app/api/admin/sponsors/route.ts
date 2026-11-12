import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";

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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const logoUrl = typeof body.logoUrl === "string" ? body.logoUrl.trim() : null;
  const websiteUrl = typeof body.websiteUrl === "string" ? body.websiteUrl.trim() : null;
  const tier = typeof body.tier === "string" ? body.tier.trim() : "Benefactor";

  if (!name) {
    return Response.json({ error: "Nama sponsor wajib diisi." }, { status: 400 });
  }

  const sponsor = await prisma.sponsor.create({
    data: {
      name,
      logoUrl: logoUrl || null,
      websiteUrl: websiteUrl || null,
      tier: tier || "Benefactor",
    },
  });

  return Response.json({ success: true, sponsor, message: "Sponsor baru berhasil ditambahkan!" }, { status: 201 });
}
