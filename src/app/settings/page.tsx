import { SettingsDashboard } from "@/components/settings-dashboard";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Pengaturan Akun — LogHorizon" };
export const instant = false;

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin/discord?callbackUrl=%2Fsettings");
  return <SettingsDashboard />;
}
