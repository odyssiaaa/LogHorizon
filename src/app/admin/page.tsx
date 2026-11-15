import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isGuildOwner } from "@/lib/caste";

export const metadata = { title: "Admin Panel | LogHorizon" };
export const instant = false;

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isBanned: true, username: true, name: true, discordId: true, email: true },
  });
  if (!user || user.isBanned || (user.role !== "ADMIN" && user.role !== "MODERATOR")) redirect("/");

  const isOwner = isGuildOwner(user);

  return <AdminDashboard role={user.role} isOwner={isOwner} />;
}
