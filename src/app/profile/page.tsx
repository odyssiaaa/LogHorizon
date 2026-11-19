import { SettingsDashboard } from "@/components/settings-dashboard";

export const metadata = { title: "Profil & Pengaturan Akun | LogHorizon" };
export const instant = false;

export default async function ProfilePage() {
  return <SettingsDashboard />;
}
