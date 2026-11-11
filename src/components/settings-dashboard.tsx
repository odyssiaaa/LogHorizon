"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { BadgeCheck, Bell, ExternalLink, RefreshCw, Shield, SunMoon, Type } from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { DiscordAvatar } from "@/components/discord-avatar";

type Profile = {
  id: string;
  discordId: string | null;
  username: string | null;
  avatar: string | null;
  level: number;
  xp: number;
  role: string;
  isPremium: boolean;
};
type Listing = {
  id: string;
  title: string;
  category: string;
  marketData: unknown;
  createdAt: string;
  reports: { pending: number; resolved: number };
};
type PreferenceState = { dark: boolean; largeFont: boolean; animations: boolean; notifications: boolean };
const initialPreferences: PreferenceState = { dark: true, largeFont: false, animations: true, notifications: false };

function listingStatus(value: unknown) {
  if (!value || typeof value !== "object" || !("status" in value)) return null;
  const status = value.status;
  return status === "AVAILABLE" || status === "SOLD" || status === "IN_ESCROW" ? status : null;
}

export function SettingsDashboard() {
  const { data: session, status, update } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingStatus, setSavingStatus] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("loghorizon-preferences");
        const savedTheme = localStorage.getItem("loghorizon-theme");
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            const value = parsed as Record<string, unknown>;
            setPreferences({
              dark: savedTheme === "light" ? false : savedTheme === "dark" ? true : typeof value.dark === "boolean" ? value.dark : true,
              largeFont: typeof value.largeFont === "boolean" ? value.largeFont : false,
              animations: typeof value.animations === "boolean" ? value.animations : true,
              notifications: typeof value.notifications === "boolean" ? value.notifications : false,
            });
          }
        } else if (savedTheme === "light" || savedTheme === "dark") {
          setPreferences((current) => ({ ...current, dark: savedTheme === "dark" }));
        }
      } catch (reason) {
        console.error("[settings] Failed to read browser preferences", reason);
        setError("Preferensi tersimpan tidak dapat dibaca di browser ini.");
      } finally {
        setPreferencesReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    document.documentElement.classList.toggle("dark", preferences.dark);
    document.documentElement.style.colorScheme = preferences.dark ? "dark" : "light";
    document.documentElement.classList.toggle("large-font", preferences.largeFont);
    document.documentElement.classList.toggle("reduce-motion", !preferences.animations);
    try {
      localStorage.setItem("loghorizon-preferences", JSON.stringify(preferences));
      localStorage.setItem("loghorizon-theme", preferences.dark ? "dark" : "light");
      window.dispatchEvent(new CustomEvent("loghorizon-preferences", { detail: preferences }));
    } catch (reason) {
      console.error("[settings] Failed to save browser preferences", reason);
    }
  }, [preferences, preferencesReady]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    Promise.all([
      fetch("/api/settings/profile").then((response) => readApiResponse<Profile>(response, "Profil gagal dimuat.")),
      fetch("/api/settings/listings").then((response) => readApiResponse<Listing[]>(response, "Riwayat lapak gagal dimuat.")),
    ]).then(([nextProfile, nextListings]) => {
      if (!active) return;
      setProfile(nextProfile);
      setListings(nextListings);
      setError("");
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Pengaturan gagal dimuat.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [status]);

  function updatePreference<K extends keyof PreferenceState>(key: K, value: PreferenceState[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  async function syncProfile() {
    setSyncing(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/settings/profile", { method: "POST" });
      const result = await readApiResponse<{ profile: Profile; notice: string }>(response, "Sinkronisasi Discord gagal.");
      setProfile(result.profile);
      setMessage(result.notice);
      await update();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sinkronisasi Discord gagal.");
    } finally {
      setSyncing(false);
    }
  }

  async function changeListingStatus(listing: Listing, nextStatus: "AVAILABLE" | "SOLD") {
    setSavingStatus(listing.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/posts/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await readApiResponse<unknown>(response, "Status lapak gagal diperbarui.");
      setListings((current) => current.map((entry) => entry.id === listing.id && entry.marketData && typeof entry.marketData === "object"
        ? { ...entry, marketData: { ...entry.marketData, status: nextStatus } }
        : entry));
      setMessage("Status lapak berhasil diperbarui.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Status lapak gagal diperbarui.");
    } finally {
      setSavingStatus("");
    }
  }

  if (status === "loading" || (status === "authenticated" && loading)) return <main className="community-page"><div className="empty-state">Memuat pengaturan…</div></main>;
  if (!session?.user) return <main className="community-page page-shell settings-page"><p className="section-kicker">ACCOUNT / SETTINGS</p><h1>Pengaturan <span>Akun</span></h1><p className="muted-copy">Hubungkan Discord untuk mengelola profil dan preferensi.</p><button className="button button-discord" onClick={() => void signIn("discord", { callbackUrl: "/settings" })}>Login dengan Discord</button></main>;

  return <main className="community-page settings-page page-shell py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full max-w-full overflow-x-hidden">
    <header className="settings-heading flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"><div><p className="section-kicker text-xs font-bold text-[#9D4EDD] uppercase tracking-wider mb-1">ACCOUNT / CONTROL CENTER</p><h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white break-words">Pengaturan <span className="text-[#9D4EDD] dark:text-[#C77DFF]">Akun</span></h1><p className="muted-copy text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Profil, preferensi antarmuka, dan aktivitas komunitas.</p></div><div className="settings-account-chip self-start sm:self-auto"><DiscordAvatar className="settings-avatar" src={profile?.avatar ?? session.user.avatar} username={profile?.username ?? session.user.username} size={40} />{profile?.username ?? session.user.name ?? "Adventurer"}<span>{profile?.role ?? session.user.role}</span></div></header>
    {error && <div className="inline-error" role="alert">{error}</div>}
    {message && <div className="inline-notice" role="status">{message}</div>}
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Menu pengaturan"><a href="#profile-settings"><Shield size={16} /> Profil Saya</a><a href="#preference-settings"><SunMoon size={16} /> Preferensi UI</a><a href="#listing-settings"><BadgeCheck size={16} /> Lapak & Notifikasi</a></nav>
      <div className="settings-content">
        <section className="settings-panel" id="profile-settings"><div className="settings-panel-heading"><div><p className="section-kicker">01 / PROFILE SYNC</p><h2>Profil Saya</h2></div><button className="button button-quiet" onClick={() => void syncProfile()} disabled={syncing}><RefreshCw size={15} className={syncing ? "spin-icon" : ""} /> {syncing ? "Sinkronisasi…" : "Sync Discord Profile"}</button></div>
          <dl className="settings-profile-grid"><div><dt>Discord ID</dt><dd>{profile?.discordId ?? "Belum tersedia"}</dd></div><div><dt>Username</dt><dd>{profile?.username ?? "Gamer"}</dd></div><div><dt>Role komunitas</dt><dd>{profile?.role ?? session.user.role}</dd></div><div><dt>Level / XP</dt><dd>Lv. {profile?.level ?? 1} · {profile?.xp ?? 0} XP</dd></div><div><dt>Benefit</dt><dd>{profile?.isPremium ? "Elite Party Member" : "Adventurer"}</dd></div></dl>
        </section>
        <section className="settings-panel" id="preference-settings"><div className="settings-panel-heading"><div><p className="section-kicker">02 / INTERFACE</p><h2>Preferensi Antarmuka</h2></div></div>
          <label className="settings-toggle"><span><SunMoon size={17} /><span><strong>Mode gelap</strong><small>Gunakan tema taktis gelap sebagai tampilan utama.</small></span></span><input type="checkbox" checked={preferences.dark} onChange={(event) => updatePreference("dark", event.target.checked)} /></label>
          <label className="settings-toggle"><span><Type size={17} /><span><strong>Ukuran artikel besar</strong><small>Perbesar teks isi thread dan komentar.</small></span></span><input type="checkbox" checked={preferences.largeFont} onChange={(event) => updatePreference("largeFont", event.target.checked)} /></label>
          <label className="settings-toggle"><span><RefreshCw size={17} /><span><strong>Animasi antarmuka</strong><small>Matikan untuk mengurangi gerakan dan beban perangkat.</small></span></span><input type="checkbox" checked={preferences.animations} onChange={(event) => updatePreference("animations", event.target.checked)} /></label>
          <p className="settings-footnote">Preferensi ini disimpan di browser perangkat ini.</p>
        </section>
        <section className="settings-panel" id="listing-settings"><div className="settings-panel-heading"><div><p className="section-kicker">03 / ACTIVITY</p><h2>Lapak & Notifikasi</h2></div><a className="text-link" href="/marketplace">Buka marketplace <ExternalLink size={14} /></a></div>
          <label className="settings-toggle"><span><Bell size={17} /><span><strong>Notifikasi balasan & transaksi</strong><small>Simpan preferensi untuk pemberitahuan thread dan aktivitas lapak.</small></span></span><input type="checkbox" checked={preferences.notifications} onChange={(event) => updatePreference("notifications", event.target.checked)} /></label>
          <p className="settings-footnote">Preferensi notifikasi tersimpan di profil akun kamu.</p>
          <div className="settings-listings-wrap w-full overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"><table className="settings-listings min-w-[550px] w-full"><thead><tr><th>Postingan</th><th>Tanggal</th><th>Laporan</th><th>Status lapak</th></tr></thead><tbody>
            {listings.map((listing) => {
              const status = listingStatus(listing.marketData);
              return <tr key={listing.id}><td><a href={status ? "/marketplace" : `/forum/${listing.id}`}>{listing.title}</a><small>{listing.category.replaceAll("_", " ")}</small></td><td>{new Date(listing.createdAt).toLocaleDateString("id-ID")}</td><td>{listing.reports.pending} pending · {listing.reports.resolved} selesai</td><td>{status ? <select aria-label={`Status ${listing.title}`} value={status === "IN_ESCROW" ? "AVAILABLE" : status} disabled={status === "IN_ESCROW" || savingStatus === listing.id} onChange={(event) => void changeListingStatus(listing, event.target.value as "AVAILABLE" | "SOLD")}><option value="AVAILABLE">AVAILABLE</option><option value="SOLD">SOLD</option></select> : "Thread Forum"}</td></tr>;
            })}
            {!listings.length && <tr><td colSpan={4}>Belum ada postingan atau lapak.</td></tr>}
          </tbody></table></div>
        </section>
      </div>
    </div>
  </main>;
}
