import { SettingsDashboard } from "@/components/settings-dashboard";

export const metadata = { title: "Pengaturan Akun | LogHorizon" };
export const instant = false;

export default async function SettingsPage() {
  return <SettingsDashboard />;
}
