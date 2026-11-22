import { Suspense } from "react";
import { SettingsDashboard } from "@/components/settings-dashboard";

export const metadata = { title: "Pengaturan Akun | LogHorizon" };
export const instant = false;

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-[1240px] mx-auto px-4 py-16 text-center text-xs font-mono text-gray-400">
          Memuat pengaturan akun...
        </div>
      }
    >
      <SettingsDashboard />
    </Suspense>
  );
}
