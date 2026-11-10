import { authenticatedUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await authenticatedUser();
  if (!user) return jsonError("Login diperlukan.", 401);
  const posts = await prisma.post.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      category: true,
      marketData: true,
      createdAt: true,
      reports: { select: { status: true } },
    },
  });
  return Response.json(posts.map((post) => ({
    ...post,
    reports: {
      pending: post.reports.filter((report) => report.status === "PENDING").length,
      resolved: post.reports.filter((report) => report.status === "RESOLVED").length,
    },
  })));
}
