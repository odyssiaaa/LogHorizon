import { SettingsDashboard } from "@/components/settings-dashboard";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Profil & Pengaturan Akun | LogHorizon" };
export const instant = false;

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin/discord?callbackUrl=%2Fprofile");
  return <SettingsDashboard />;
}
